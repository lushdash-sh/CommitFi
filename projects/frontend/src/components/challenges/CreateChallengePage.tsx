import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'
import * as algokit from '@algorandfoundation/algokit-utils'
import { CommitFiFactory } from '../../contracts/CommitFiClient'
import { db } from '../../utils/Firebase'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import AcademicForm, { type AcademicFormData } from './AcademicForm'
import ChallengeTypeToggle from './ChallengeTypeToggle'
import FitnessForm, { type FitnessFormData } from './FitnessForm'
import {
  type FitnessActivityType,
  checkFitnessChallengeCompletion,
  exchangeStravaCodeForToken,
  parseStravaAuthFromUrl,
  redirectToStravaAuth,
} from '../../services/StravaService'

type ChallengeCategory = 'academics' | 'fitness'

interface CreateChallengePageProps {
  onCreated: () => void
}

const initialAcademicForm: AcademicFormData = {
  title: '',
  description: '',
  stakeAmount: 10,
  maxMembers: 50,
  durationValue: 7,
  durationUnit: 'days',
  templateUrl: '',
}

const initialFitnessForm: FitnessFormData = {
  title: '',
  description: '',
  stakeAmount: 10,
  durationDays: 7,
  activityType: 'running',
  targetGoal: '',
}

const durationToSeconds = (durationValue: number, durationUnit: AcademicFormData['durationUnit']): number => {
  if (durationUnit === 'hours') return durationValue * 3600
  if (durationUnit === 'days') return durationValue * 86400
  return durationValue * 30 * 86400
}

const scheduleFitnessVerification = (params: {
  challengeDocId: string
  stravaToken: string
  activityType: FitnessActivityType
  targetGoal: string
  startTimestamp: number
  endTimestamp: number
}): void => {
  const { challengeDocId, stravaToken, activityType, targetGoal, startTimestamp, endTimestamp } = params
  const delayMs = Math.max(0, endTimestamp * 1000 - Date.now())

  setTimeout(async () => {
    try {
      const completed = await checkFitnessChallengeCompletion({
        accessToken: stravaToken,
        activityType,
        targetGoal,
        fromTimestamp: startTimestamp,
        toTimestamp: endTimestamp,
      })

      await updateDoc(doc(db, 'challenges', challengeDocId), {
        verificationStatus: completed ? 'verified-success' : 'verified-failed',
        completed,
        verifiedAt: Date.now(),
      })
    } catch (error) {
      await updateDoc(doc(db, 'challenges', challengeDocId), {
        verificationStatus: 'verification-error',
        verificationError: (error as Error).message,
      })
    }
  }, delayMs)
}

const CreateChallengePage = ({ onCreated }: CreateChallengePageProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory>('academics')
  const [academicFormData, setAcademicFormData] = useState<AcademicFormData>(initialAcademicForm)
  const [fitnessFormData, setFitnessFormData] = useState<FitnessFormData>(initialFitnessForm)
  const [stravaToken, setStravaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const existingToken = sessionStorage.getItem('strava_access_token')
    if (existingToken) {
      setStravaToken(existingToken)
    }

    const syncTokenFromAuthCode = async () => {
      try {
        const authResult = parseStravaAuthFromUrl(window.location.search)
        if (!authResult?.code) return

        const expectedState = sessionStorage.getItem('strava_oauth_state')
        if (expectedState && authResult.state && expectedState !== authResult.state) {
          throw new Error('Invalid Strava OAuth state. Please try connecting again.')
        }

        const tokenResult = await exchangeStravaCodeForToken(authResult.code)
        if (!isMounted) return

        setStravaToken(tokenResult.access_token)
        sessionStorage.setItem('strava_access_token', tokenResult.access_token)
        sessionStorage.removeItem('strava_oauth_state')

        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) {
        alert((error as Error).message)
      }
    }

    void syncTokenFromAuthCode()

    return () => {
      isMounted = false
    }
  }, [])

  const canSubmitAcademics = useMemo(
    () => Boolean(academicFormData.title && academicFormData.templateUrl),
    [academicFormData.title, academicFormData.templateUrl],
  )

  const canSubmitFitness = useMemo(
    () => Boolean(fitnessFormData.title && fitnessFormData.targetGoal && stravaToken),
    [fitnessFormData.title, fitnessFormData.targetGoal, stravaToken],
  )

  const handleAcademicCreate = async () => {
    if (!activeAddress) {
      alert('Connect Wallet first')
      return
    }

    if (!canSubmitAcademics) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const durationInSeconds = durationToSeconds(academicFormData.durationValue, academicFormData.durationUnit)
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + durationInSeconds

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const factory = new CommitFiFactory({
        algorand,
        defaultSender: activeAddress,
      })

      const { result, appClient } = await factory.send.create.createChallenge({
        args: {
          stakeAmountParam: BigInt(academicFormData.stakeAmount * 1_000_000),
          deadlineParam: BigInt(deadlineTimestamp),
          maxParticipantsParam: BigInt(academicFormData.maxMembers),
        },
      })

      const newAppAddress = result.appAddress

      await algorand.send.payment({
        sender: activeAddress,
        receiver: newAppAddress,
        amount: algokit.algo(0.2),
      })

      const paymentTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: newAppAddress,
        amount: algokit.microAlgos(academicFormData.stakeAmount * 1_000_000),
      })

      await appClient.send.optIn.joinPool({
        args: { payment: paymentTxn },
        extraFee: algokit.microAlgos(2000),
      })

      await addDoc(collection(db, 'challenges'), {
        type: 'academics',
        title: academicFormData.title,
        description: academicFormData.description,
        stakeAmount: academicFormData.stakeAmount,
        maxMembers: academicFormData.maxMembers,
        templateUrl: academicFormData.templateUrl,
        creator: activeAddress,
        createdAt: Date.now(),
        deadline: deadlineTimestamp,
        appId: result.appId.toString(),
      })

      alert('Challenge Created Successfully!')
      onCreated()
    } catch (error) {
      alert(`Creation Failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFitnessCreate = async () => {
    if (!activeAddress) {
      alert('Connect Wallet first')
      return
    }

    if (!canSubmitFitness || !stravaToken) {
      alert('Please fill all fields and connect your Strava account')
      return
    }

    setLoading(true)

    try {
      const nowTimestamp = Math.floor(Date.now() / 1000)
      const deadlineTimestamp = nowTimestamp + fitnessFormData.durationDays * 86400

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const factory = new CommitFiFactory({
        algorand,
        defaultSender: activeAddress,
      })

      const { result, appClient } = await factory.send.create.createChallenge({
        args: {
          stakeAmountParam: BigInt(fitnessFormData.stakeAmount * 1_000_000),
          deadlineParam: BigInt(deadlineTimestamp),
          maxParticipantsParam: BigInt(1),
        },
      })

      const newAppAddress = result.appAddress

      await algorand.send.payment({
        sender: activeAddress,
        receiver: newAppAddress,
        amount: algokit.algo(0.2),
      })

      const paymentTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: newAppAddress,
        amount: algokit.microAlgos(fitnessFormData.stakeAmount * 1_000_000),
      })

      await appClient.send.optIn.joinPool({
        args: { payment: paymentTxn },
        extraFee: algokit.microAlgos(2000),
      })

      const challengeRef = await addDoc(collection(db, 'challenges'), {
        type: 'fitness',
        title: fitnessFormData.title,
        description: fitnessFormData.description,
        activityType: fitnessFormData.activityType,
        targetGoal: fitnessFormData.targetGoal,
        stakeAmount: fitnessFormData.stakeAmount,
        duration: fitnessFormData.durationDays,
        stravaConnected: true,
        creator: activeAddress,
        createdAt: Date.now(),
        deadline: deadlineTimestamp,
        appId: result.appId.toString(),
        verificationStatus: 'scheduled',
      })

      scheduleFitnessVerification({
        challengeDocId: challengeRef.id,
        stravaToken,
        activityType: fitnessFormData.activityType,
        targetGoal: fitnessFormData.targetGoal,
        startTimestamp: nowTimestamp,
        endTimestamp: deadlineTimestamp,
      })

      alert('Fitness challenge created successfully!')
      onCreated()
    } catch (error) {
      alert(`Creation Failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectStrava = () => {
    try {
      redirectToStravaAuth()
    } catch (error) {
      alert((error as Error).message)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="bg-cyber-dark/30 border border-neon-green/20 p-8 rounded-xl backdrop-blur-md">
        <h2 className="text-4xl font-cyber text-neon-green mb-8 tracking-wide text-center">CREATE STAKE</h2>

        <ChallengeTypeToggle selectedCategory={selectedCategory} onChange={setSelectedCategory} />

        <div className="transition-all duration-300 ease-out">
          {selectedCategory === 'academics' ? (
            <AcademicForm
              formData={academicFormData}
              loading={loading}
              onChange={setAcademicFormData}
              onSubmit={handleAcademicCreate}
            />
          ) : (
            <FitnessForm
              formData={fitnessFormData}
              loading={loading}
              stravaToken={stravaToken}
              onChange={setFitnessFormData}
              onConnectStrava={handleConnectStrava}
              onSubmit={handleFitnessCreate}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateChallengePage
