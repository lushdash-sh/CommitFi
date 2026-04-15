import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import ConnectWallet from './ConnectWallet'
import Home from './Home'
import Staking from './Staking'
import StudyCircle from './StudyCircle'
import StudyCircleHub from './StudyCircleHub'
import Vault from './Vault'

// Types
export type PageType = 'home' | 'staking' | 'study-circle' | 'vault'
export const APP_ID = 755419650

const CommitFi = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)
  
  const { activeAddress } = useWallet()
  const toggleWalletModal = () => setOpenWalletModal(!openWalletModal)

  // Navigation Logic
  const handleNavigateToStudy = (challengeId: string) => {
    setSelectedChallengeId(challengeId)
    setCurrentPage('study-circle')
  }

const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onViewDetails={handleNavigateToStudy} />
      case 'staking':
        return <Staking onCreated={() => setCurrentPage('home')} />
      case 'study-circle':
        return selectedChallengeId ? (
          <StudyCircle 
            challengeId={selectedChallengeId}
            onBack={() => setSelectedChallengeId(null)}
          />
        ) : (
          <StudyCircleHub onSelectChallenge={handleNavigateToStudy} />
        )
      case 'vault':
        return <Vault onViewDetails={handleNavigateToStudy} selectionMode={false} />
      default:
        return <Home onViewDetails={handleNavigateToStudy} />
    }
  }

  // Helper to format tab names nicely
  const getTabLabel = (page: string) => {
    if (page === 'staking') return 'Create Challenge'
    if (page === 'study-circle') return 'Your Circle/Contract'
    return page
  }

  return (
    <div className="min-h-screen bg-cyber-black text-white relative overflow-hidden font-sans selection:bg-neon-green selection:text-black">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-black via-cyber-dark to-cyber-black -z-10">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,136,0.05)_25%,rgba(0,255,136,0.05)_26%,transparent_27%,transparent_74%,rgba(0,255,136,0.05)_75%,rgba(0,255,136,0.05)_76%,transparent_77%,transparent)] bg-[size:50px_50px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center bg-cyber-dark/80 backdrop-blur-lg border-b border-neon-green/20">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentPage('home')}>
          <div className="w-10 h-10 bg-neon-green rounded-lg flex items-center justify-center animate-cyber-pulse group-hover:shadow-[0_0_15px_#00ff88]">
            <span className="text-cyber-black font-bold text-xl">CF</span>
          </div>
          <h1 className="text-2xl font-cyber font-bold text-neon-green tracking-wider group-hover:text-white transition-colors">COMMIT-FI</h1>
        </div>
        
        {/* UPDATED NAVIGATION BAR */}
        <nav className="hidden md:flex items-center gap-8">
          {['home', 'staking', 'vault', 'study-circle'].map((page) => (
            <button 
              key={page}
              className={`transition-all duration-300 font-mono text-sm uppercase tracking-widest ${
                currentPage === page 
                  ? 'text-neon-green border-b-2 border-neon-green pb-1' 
                  : 'text-gray-400 hover:text-white hover:scale-105'
              }`}
              onClick={() => setCurrentPage(page as PageType)}
            >
              {getTabLabel(page)}
            </button>
          ))}
        </nav>

        <button
          className="relative px-6 py-3 bg-gradient-to-r from-neon-green to-neon-blue text-cyber-black font-bold rounded-lg font-mono text-sm hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300 transform hover:scale-105"
          onClick={toggleWalletModal}
        >
          <span className="relative z-10">
            {activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'CONNECT WALLET'}
          </span>
        </button>
      </header>

      {/* Main Content */}
      {renderCurrentPage()}

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
    </div>
  )
}

export default CommitFi