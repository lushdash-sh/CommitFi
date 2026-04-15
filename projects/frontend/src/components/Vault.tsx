import { useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../utils/Firebase'
import * as algokit from '@algorandfoundation/algokit-utils'
import { CommitFiClient } from '../contracts/CommitFiClient'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface VaultProps {
  onViewDetails: (id: string) => void
  selectionMode?: boolean
}

type VaultTab = 'academic' | 'fitness' | 'business'

const Vault = ({ onViewDetails, selectionMode = false }: VaultProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const [activeTab, setActiveTab] = useState<VaultTab>('academic')
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [reputation, setReputation] = useState(100)

  useEffect(() => {
    if (!activeAddress) return

    // Fetch User Reputation
    const fetchRep = async () => {
      const userRef = doc(db, 'users', activeAddress)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        setReputation(snap.data().reputation)
      } else {
        await setDoc(userRef, { reputation: 100 })
      }
    }
    fetchRep()

    // Fetch Requests
    const q1 = query(collection(db, 'requests'), where('applicant', '==', activeAddress))
    onSnapshot(q1, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (selectionMode) {
        setMyRequests(data.filter((r: any) => r.status === 'approved'))
      } else {
        setMyRequests(data)
      }
    })

    if (!selectionMode) {
      const q2 = query(
        collection(db, 'requests'),
        where('leader', '==', activeAddress),
        where('status', '==', 'pending')
      )
      onSnapshot(q2, (snap) => setIncomingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    }
  }, [activeAddress, selectionMode])

  const handleDecision = async (reqId: string, decision: 'approved' | 'rejected') => {
    try {
      // First, get the request to check if it's a business contract
      const reqSnap = await getDoc(doc(db, 'requests', reqId))
      if (!reqSnap.exists()) return alert('Request not found')
      
      const request = reqSnap.data()
      
      // Update request status
      await updateDoc(doc(db, 'requests', reqId), { status: decision })
      
      // If business contract and approved, also update challenge document
      if (request.type === 'business' && decision === 'approved') {
        await updateDoc(doc(db, 'challenges', request.challengeId), {
          companyB: request.applicant || request.companyB, // Company B who accepted
          verificationStatus: 'awaiting-delivery',
        })
      }
      
      alert(`Request ${decision}!`)
    } catch (error) {
      alert(`Decision failed: ${(error as Error).message}`)
    }
  }

  const handlePayAndEnter = async (challengeId: string) => {
    if (!activeAddress) return alert('Connect Wallet')
    setLoading(true)
    try {
      const challengeSnap = await getDoc(doc(db, 'challenges', challengeId))
      if (!challengeSnap.exists()) throw new Error('Challenge not found')

      const challengeData = challengeSnap.data()
      const appId = BigInt(challengeData.appId)
      const stakeAmount = challengeData.stakeAmount

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = algokit.AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const accountInfo = await algorand.client.algod.accountInformation(activeAddress).do()
      const hasOptedIn = accountInfo.appsLocalState?.some((a: any) => a.id === Number(appId))

      if (hasOptedIn) {
        onViewDetails(challengeId)
        setLoading(false)
        return
      }

      const client = new CommitFiClient({
        algorand,
        appId: appId,
        defaultSender: activeAddress,
      })

      const paymentTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: client.appAddress,
        amount: algokit.microAlgos(stakeAmount * 1_000_000),
      })

      await client.send.optIn.joinPool({
        args: { payment: paymentTxn },
        extraFee: algokit.microAlgos(2000),
      })

      onViewDetails(challengeId)
    } catch (e) {
      console.error(e)
      if ((e as Error).message.includes('has already opted in')) {
        onViewDetails(challengeId)
      } else {
        alert(`Payment Failed: ${(e as Error).message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const getTabContent = () => {
    switch (activeTab) {
      case 'academic':
        return renderAcademicSection()
      case 'fitness':
        return renderFitnessSection()
      case 'business':
        return renderBusinessSection()
      default:
        return null
    }
  }

  const renderAcademicSection = () => (
    <div className={`grid grid-cols-1 ${selectionMode ? 'justify-center' : 'md:grid-cols-2'} gap-8`}>
      <div
        className={`bg-cyber-dark/40 p-8 rounded-xl border ${
          selectionMode ? 'border-neon-green/50 w-full max-w-3xl mx-auto' : 'border-neon-blue/20'
        }`}
      >
        <h2
          className={`text-3xl font-cyber mb-6 ${
            selectionMode ? 'text-neon-green text-center' : 'text-neon-blue'
          }`}
        >
          {selectionMode ? 'SELECT A CIRCLE TO ENTER' : 'MY ACADEMIC CHALLENGES'}
        </h2>
        {myRequests
          .filter((r: any) => r.type === 'academic' || !r.type)
          .map((req) => (
            <div
              key={req.id}
              className="bg-black/40 p-6 rounded-lg border border-gray-800 flex justify-between items-center mb-4"
            >
              <div>
                <div className="text-sm text-gray-400 font-mono mb-1">CHALLENGE ID</div>
                <div className="text-white font-bold">{req.challengeId.slice(0, 8)}...</div>
                {!selectionMode && <div className="text-xs text-neon-green mt-1">STATUS: {req.status.toUpperCase()}</div>}
              </div>
              {req.status === 'approved' ? (
                <button
                  onClick={() => handlePayAndEnter(req.challengeId)}
                  disabled={loading}
                  className="px-6 py-2 bg-neon-green text-black font-bold rounded hover:opacity-90"
                >
                  {loading ? '...' : 'PAY & ENTER'}
                </button>
              ) : (
                <span className="text-yellow-500 text-sm">PENDING</span>
              )}
            </div>
          ))}
      </div>

      {!selectionMode && (
        <div className="bg-cyber-dark/40 p-8 rounded-xl border border-neon-green/20">
          <h2 className="text-3xl font-cyber text-neon-green mb-6">ACADEMIC REQUESTS</h2>
          {incomingRequests
            .filter((r: any) => r.type === 'academic' || !r.type)
            .map((req) => (
              <div key={req.id} className="bg-black/40 p-6 rounded-lg border border-gray-800 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white font-bold">{req.applicant.slice(0, 6)}...</span>
                  <span className="text-gray-500 text-xs">wants to join</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(req.id, 'approved')}
                    className="flex-1 bg-neon-green/20 text-neon-green border border-neon-green rounded py-1 text-xs font-bold"
                  >
                    ACCEPT
                  </button>
                  <button
                    onClick={() => handleDecision(req.id, 'rejected')}
                    className="flex-1 bg-red-500/20 text-red-500 border border-red-500 rounded py-1 text-xs font-bold"
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )

  const renderFitnessSection = () => (
    <div className={`grid grid-cols-1 ${selectionMode ? 'justify-center' : 'md:grid-cols-2'} gap-8`}>
      <div
        className={`bg-cyber-dark/40 p-8 rounded-xl border ${
          selectionMode ? 'border-neon-green/50 w-full max-w-3xl mx-auto' : 'border-neon-blue/20'
        }`}
      >
        <h2
          className={`text-3xl font-cyber mb-6 ${
            selectionMode ? 'text-neon-green text-center' : 'text-neon-blue'
          }`}
        >
          {selectionMode ? 'SELECT A CHALLENGE TO ENTER' : 'MY FITNESS CHALLENGES'}
        </h2>
        {myRequests
          .filter((r: any) => r.type === 'fitness')
          .map((req) => (
            <div
              key={req.id}
              className="bg-black/40 p-6 rounded-lg border border-gray-800 flex justify-between items-center mb-4"
            >
              <div>
                <div className="text-sm text-gray-400 font-mono mb-1">CHALLENGE ID</div>
                <div className="text-white font-bold">{req.challengeId.slice(0, 8)}...</div>
                {!selectionMode && <div className="text-xs text-neon-green mt-1">STATUS: {req.status.toUpperCase()}</div>}
              </div>
              {req.status === 'approved' ? (
                <button
                  onClick={() => handlePayAndEnter(req.challengeId)}
                  disabled={loading}
                  className="px-6 py-2 bg-neon-green text-black font-bold rounded hover:opacity-90"
                >
                  {loading ? '...' : 'PAY & ENTER'}
                </button>
              ) : (
                <span className="text-yellow-500 text-sm">PENDING</span>
              )}
            </div>
          ))}
      </div>

      {!selectionMode && (
        <div className="bg-cyber-dark/40 p-8 rounded-xl border border-neon-green/20">
          <h2 className="text-3xl font-cyber text-neon-green mb-6">FITNESS REQUESTS</h2>
          {incomingRequests
            .filter((r: any) => r.type === 'fitness')
            .map((req) => (
              <div key={req.id} className="bg-black/40 p-6 rounded-lg border border-gray-800 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white font-bold">{req.applicant.slice(0, 6)}...</span>
                  <span className="text-gray-500 text-xs">wants to join</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(req.id, 'approved')}
                    className="flex-1 bg-neon-green/20 text-neon-green border border-neon-green rounded py-1 text-xs font-bold"
                  >
                    ACCEPT
                  </button>
                  <button
                    onClick={() => handleDecision(req.id, 'rejected')}
                    className="flex-1 bg-red-500/20 text-red-500 border border-red-500 rounded py-1 text-xs font-bold"
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )

  const renderBusinessSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Contracts I Created (Company A) */}
      <div className="bg-cyber-dark/40 p-8 rounded-xl border border-neon-blue/20">
        <h2 className="text-3xl font-cyber text-neon-blue mb-6">MY CONTRACTS</h2>
        {myRequests
          .filter((r: any) => r.type === 'business' && r.role === 'company-a')
          .length === 0 ? (
          <div className="text-gray-500 text-sm font-mono">No contracts created yet.</div>
        ) : (
          myRequests
            .filter((r: any) => r.type === 'business' && r.role === 'company-a')
            .map((req) => (
              <div key={req.id} className="bg-black/40 p-6 rounded-lg border border-gray-800 mb-4">
                <div className="text-sm text-gray-400 font-mono mb-2">{req.businessTitle}</div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-sm">{req.companyB.slice(0, 6)}...</span>
                  <span className="text-neon-blue text-xs font-bold uppercase">{req.status}</span>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Contracts I'm Part Of (Company B) */}
      <div className="bg-cyber-dark/40 p-8 rounded-xl border border-neon-green/20">
        <h2 className="text-3xl font-cyber text-neon-green mb-6">PENDING CONTRACTS</h2>
        {incomingRequests
          .filter((r: any) => r.type === 'business' && r.role === 'company-b')
          .length === 0 ? (
          <div className="text-gray-500 text-sm font-mono">No pending contracts.</div>
        ) : (
          incomingRequests
            .filter((r: any) => r.type === 'business' && r.role === 'company-b')
            .map((req) => (
              <div key={req.id} className="bg-black/40 p-6 rounded-lg border border-gray-800 mb-4">
                <div className="text-sm text-gray-400 font-mono mb-2">{req.businessTitle}</div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white font-bold text-sm">{req.companyA.slice(0, 6)}...</span>
                  <span className="text-yellow-500 text-xs">Review: {req.reviewPeriodHours}h</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(req.id, 'approved')}
                    className="flex-1 bg-neon-green/20 text-neon-green border border-neon-green rounded py-1 text-xs font-bold"
                  >
                    ACCEPT
                  </button>
                  <button
                    onClick={() => handleDecision(req.id, 'rejected')}
                    className="flex-1 bg-red-500/20 text-red-500 border border-red-500 rounded py-1 text-xs font-bold"
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      {/* REPUTATION CARD */}
      {!selectionMode && (
        <div className="bg-gradient-to-r from-cyber-dark to-black border border-neon-blue/30 rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-cyber text-white">WELCOME TO YOUR VAULT</h2>
            <p className="text-gray-400 font-mono text-sm mt-1">Manage your stakes and approvals.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-neon-blue font-bold uppercase tracking-widest">Reputation Score</div>
            <div className="text-5xl font-mono font-bold text-white shadow-neon-blue drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
              {reputation}
            </div>
          </div>
        </div>
      )}

      {/* TAB NAVIGATION */}
      {!selectionMode && (
        <div className="mb-8">
          <div className="w-full bg-black/40 border border-neon-green/30 rounded-xl p-1.5 flex gap-2 backdrop-blur-md">
            {(['academic', 'fitness', 'business'] as VaultTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 rounded-lg font-mono text-sm uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-neon-green to-neon-blue text-cyber-black shadow-[0_0_20px_rgba(0,255,136,0.35)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT */}
      {getTabContent()}
    </div>
  )
}
export default Vault