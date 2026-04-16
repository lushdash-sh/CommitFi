import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import * as algokit from '@algorandfoundation/algokit-utils'
import { CommitFiFactory } from '../../contracts/CommitFiClient'
import { db } from '../../utils/Firebase'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import AcademicForm, { type AcademicFormData } from './AcademicForm'
import BusinessForm, { type BusinessFormData } from './BusinessForm'
import ChallengeTypeToggle from './ChallengeTypeToggle'
import FitnessForm, { type FitnessFormData } from './FitnessForm'
import {
  type FitnessActivityType,
  checkFitnessChallengeCompletion,
  exchangeStravaCodeForToken,
  parseStravaAuthFromUrl,
  redirectToStravaAuth,
} from '../../services/StravaService'

type ChallengeCategory = 'academics' | 'fitness' | 'business'

interface CreateChallengePageProps {
  onCreated: () => void
}

const initialAcademicForm: AcademicFormData = {
  title: '', description: '', stakeAmount: 10, maxMembers: 50, durationValue: 7, durationUnit: 'days', templateUrl: '',
}

const initialFitnessForm: FitnessFormData = {
  title: '', description: '', stakeAmount: 10, maxMembers: 50, durationValue: 7, durationUnit: 'days', activityType: '', targetGoal: '',
}

const initialBusinessForm: BusinessFormData = {
  title: '',
  description: '',
  stakeAmount: 10,
  durationDays: 30,
  reviewPeriodHours: 48,
  companyAName: '',
  companyBAddress: '',
  companyBName: '',
  deliverableType: 'pdf',
}

const durationToSeconds = (durationValue: number, durationUnit: AcademicFormData['durationUnit']): number => {
  if (durationUnit === 'hours') return durationValue * 3600
  if (durationUnit === 'days') return durationValue * 86400
  return durationValue * 30 * 86400
}

const scheduleFitnessVerification = (params: {
  challengeDocId: string, stravaToken: string, activityType: FitnessActivityType, targetGoal: string, startTimestamp: number, endTimestamp: number
}): void => {
  const { challengeDocId, stravaToken, activityType, targetGoal, startTimestamp, endTimestamp } = params
  const delayMs = Math.max(0, endTimestamp * 1000 - Date.now())

  setTimeout(async () => {
    try {
      const completed = await checkFitnessChallengeCompletion({
        accessToken: stravaToken, activityType, targetGoal, fromTimestamp: startTimestamp, toTimestamp: endTimestamp,
      })
      await updateDoc(doc(db, 'challenges', challengeDocId), { verificationStatus: completed ? 'verified-success' : 'verified-failed', completed, verifiedAt: Date.now() })
    } catch (error) {
      await updateDoc(doc(db, 'challenges', challengeDocId), { verificationStatus: 'verification-error', verificationError: (error as Error).message })
    }
  }, delayMs)
}

const CreateChallengePage = ({ onCreated }: CreateChallengePageProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory>('academics')
  const [academicFormData, setAcademicFormData] = useState<AcademicFormData>(initialAcademicForm)
  const [fitnessFormData, setFitnessFormData] = useState<FitnessFormData>(initialFitnessForm)
  const [businessFormData, setBusinessFormData] = useState<BusinessFormData>(initialBusinessForm)
  const [stravaToken, setStravaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const existingToken = sessionStorage.getItem('strava_access_token')
    if (existingToken) setStravaToken(existingToken)

    const syncTokenFromAuthCode = async () => {
      try {
        const authResult = parseStravaAuthFromUrl(window.location.search)
        if (!authResult?.code) return

        const expectedState = sessionStorage.getItem('strava_oauth_state')
        if (expectedState && authResult.state && expectedState !== authResult.state) throw new Error('Invalid Strava OAuth state.')

        const tokenResult = await exchangeStravaCodeForToken(authResult.code)
        if (!isMounted) return

        setStravaToken(tokenResult.access_token)
        sessionStorage.setItem('strava_access_token', tokenResult.access_token)
        sessionStorage.removeItem('strava_oauth_state')

        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) { alert((error as Error).message) }
    }
    void syncTokenFromAuthCode()
    return () => { isMounted = false }
  }, [])

  const canSubmitAcademics = useMemo(() => Boolean(academicFormData.title && academicFormData.templateUrl), [academicFormData.title, academicFormData.templateUrl])
  const canSubmitFitness = useMemo(() => Boolean(fitnessFormData.title && fitnessFormData.targetGoal && fitnessFormData.activityType && stravaToken), [fitnessFormData.title, fitnessFormData.targetGoal, fitnessFormData.activityType, stravaToken])
  const canSubmitBusiness = useMemo(() => Boolean(businessFormData.title && businessFormData.companyAName && businessFormData.companyBAddress), [businessFormData.title, businessFormData.companyAName, businessFormData.companyBAddress])

  const handleAcademicCreate = async () => {
    if (!activeAddress) return alert('Connect Wallet first')
    if (!canSubmitAcademics) return alert('Please fill in all fields')
    setLoading(true)

    try {
      const durationInSeconds = durationToSeconds(academicFormData.durationValue, academicFormData.durationUnit)
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + durationInSeconds

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)
      const factory = new CommitFiFactory({ algorand, defaultSender: activeAddress })

      const { result, appClient } = await factory.send.create.createChallenge({
        args: { stakeAmountParam: BigInt(academicFormData.stakeAmount * 1_000_000), deadlineParam: BigInt(deadlineTimestamp), maxParticipantsParam: BigInt(academicFormData.maxMembers) },
      })

      await algorand.send.payment({ sender: activeAddress, receiver: result.appAddress, amount: algokit.algo(0.2) })
      const paymentTxn = await algorand.createTransaction.payment({ sender: activeAddress, receiver: result.appAddress, amount: algokit.microAlgos(academicFormData.stakeAmount * 1_000_000) })
      await appClient.send.optIn.joinPool({ args: { payment: paymentTxn }, extraFee: algokit.microAlgos(2000) })

      addDoc(collection(db, 'challenges'), {
        type: 'academics', title: academicFormData.title, description: academicFormData.description, stakeAmount: academicFormData.stakeAmount, maxMembers: academicFormData.maxMembers, templateUrl: academicFormData.templateUrl, creator: activeAddress, createdAt: Date.now(), deadline: deadlineTimestamp, appId: result.appId.toString(),
      }).catch(console.error)

      alert('✅ Challenge Created Successfully!')
      setAcademicFormData(initialAcademicForm)
      if (typeof onCreated === 'function') onCreated()
    } catch (error) { alert(`❌ Creation Failed: ${(error as Error).message}`) } finally { setLoading(false) }
  }

  const handleFitnessCreate = async () => {
    if (!activeAddress) return alert('Connect Wallet first')
    if (!canSubmitFitness || !stravaToken) return alert('Please fill all fields and connect your Strava account')
    setLoading(true)

    try {
      // Use the newly matched duration logic
      const durationInSeconds = durationToSeconds(fitnessFormData.durationValue, fitnessFormData.durationUnit)
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + durationInSeconds
      const nowTimestamp = Math.floor(Date.now() / 1000)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)
      const factory = new CommitFiFactory({ algorand, defaultSender: activeAddress })

      // Pass the fitnessFormData.maxMembers instead of hardcoded BigInt(1)
      const { result, appClient } = await factory.send.create.createChallenge({
        args: { stakeAmountParam: BigInt(fitnessFormData.stakeAmount * 1_000_000), deadlineParam: BigInt(deadlineTimestamp), maxParticipantsParam: BigInt(fitnessFormData.maxMembers) },
      })

      await algorand.send.payment({ sender: activeAddress, receiver: result.appAddress, amount: algokit.algo(0.2) })
      const paymentTxn = await algorand.createTransaction.payment({ sender: activeAddress, receiver: result.appAddress, amount: algokit.microAlgos(fitnessFormData.stakeAmount * 1_000_000) })
      await appClient.send.optIn.joinPool({ args: { payment: paymentTxn }, extraFee: algokit.microAlgos(2000) })

      addDoc(collection(db, 'challenges'), {
        type: 'fitness', 
        title: fitnessFormData.title, 
        description: fitnessFormData.description, 
        activityType: fitnessFormData.activityType, 
        targetGoal: fitnessFormData.targetGoal, 
        stakeAmount: fitnessFormData.stakeAmount, 
        maxMembers: fitnessFormData.maxMembers,
        durationValue: fitnessFormData.durationValue, 
        durationUnit: fitnessFormData.durationUnit,
        stravaConnected: true, 
        creator: activeAddress, 
        createdAt: Date.now(), 
        deadline: deadlineTimestamp, 
        appId: result.appId.toString(), 
        verificationStatus: 'scheduled',
      }).then(challengeRef => {
        scheduleFitnessVerification({ challengeDocId: challengeRef.id, stravaToken, activityType: fitnessFormData.activityType as FitnessActivityType, targetGoal: fitnessFormData.targetGoal, startTimestamp: nowTimestamp, endTimestamp: deadlineTimestamp })
      }).catch(console.error)

      alert('✅ Fitness Challenge Created Successfully!')
      setFitnessFormData(initialFitnessForm)
      if (typeof onCreated === 'function') onCreated()
    } catch (error) { alert(`❌ Creation Failed: ${(error as Error).message}`) } finally { setLoading(false) }
  }

  const handleBusinessCreate = async () => {
    if (!activeAddress) return alert('Connect Wallet first')
    if (!canSubmitBusiness) return alert('Please fill in all required fields')
    setLoading(true)

    try {
      const nowTimestamp = Math.floor(Date.now() / 1000)
      const deadlineTimestamp = nowTimestamp + businessFormData.durationDays * 86400

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)
      const factory = new CommitFiFactory({ algorand, defaultSender: activeAddress })

      const { result, appClient } = await factory.send.create.createChallenge({
        args: { stakeAmountParam: BigInt(businessFormData.stakeAmount * 1_000_000), deadlineParam: BigInt(deadlineTimestamp), maxParticipantsParam: BigInt(2) },
      })

      await algorand.send.payment({ sender: activeAddress, receiver: result.appAddress, amount: algokit.algo(0.2) })
      const paymentTxn = await algorand.createTransaction.payment({ sender: activeAddress, receiver: result.appAddress, amount: algokit.microAlgos(businessFormData.stakeAmount * 1_000_000) })
      await appClient.send.optIn.joinPool({ args: { payment: paymentTxn }, extraFee: algokit.microAlgos(2000) })

      addDoc(collection(db, 'challenges'), {
        type: 'business',
        title: businessFormData.title,
        description: businessFormData.description,
        companyA: activeAddress,
        companyAName: businessFormData.companyAName,
        companyB: businessFormData.companyBAddress, 
        companyBName: businessFormData.companyBName,
        stakeAmount: businessFormData.stakeAmount,
        durationDays: businessFormData.durationDays,
        reviewPeriodHours: businessFormData.reviewPeriodHours,
        deliverableType: businessFormData.deliverableType,
        creator: activeAddress,
        createdAt: Date.now(),
        deadline: deadlineTimestamp,
        appId: result.appId.toString(),
        verificationStatus: 'awaiting-company-b-acceptance',
      }).then(challengeRef => {
        addDoc(collection(db, 'requests'), {
          challengeId: challengeRef.id,
          businessTitle: businessFormData.title,
          companyA: activeAddress,
          companyAName: businessFormData.companyAName,
          companyB: businessFormData.companyBAddress,
          companyBName: businessFormData.companyBName,
          leader: activeAddress,
          applicant: businessFormData.companyBAddress, 
          status: 'pending',
          timestamp: Date.now(),
          type: 'business',
          role: 'company-b',
        }).catch(console.error);
      }).catch(console.error);

      alert('✅ Business Agreement Created Successfully!\n\nContract request sent to Company B.')
      setBusinessFormData(initialBusinessForm)
      if (typeof onCreated === 'function') onCreated()
      
    } catch (error) { alert(`❌ Creation Failed: ${(error as Error).message}`) } finally { setLoading(false) }
  }

  const handleConnectStrava = () => {
    try { redirectToStravaAuth() } catch (error) { alert((error as Error).message) }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="bg-cyber-dark/30 border border-neon-green/20 p-8 rounded-xl backdrop-blur-md">
        <h2 className="text-4xl font-cyber text-neon-green mb-8 tracking-wide text-center">CREATE STAKE</h2>
        <ChallengeTypeToggle selectedCategory={selectedCategory} onChange={setSelectedCategory} />
        <div className="transition-all duration-300 ease-out">
          {selectedCategory === 'academics' ? (
            <AcademicForm formData={academicFormData} loading={loading} onChange={setAcademicFormData} onSubmit={handleAcademicCreate} />
          ) : selectedCategory === 'fitness' ? (
            <FitnessForm formData={fitnessFormData} loading={loading} stravaToken={stravaToken} onChange={setFitnessFormData} onConnectStrava={handleConnectStrava} onSubmit={handleFitnessCreate} />
          ) : (
            <BusinessForm formData={businessFormData} loading={loading} onChange={setBusinessFormData} onSubmit={handleBusinessCreate} />
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateChallengePage