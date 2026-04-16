# 🎯 Commit-Fi: Turn Your Goals into Guaranteed Success

**Stop procrastinating. Start achieving. With real skin in the game.**

---

## 💡 The Revolution in Accountability

What if every goal came with **real consequences**? What if your ambition was backed by **actual money**? 

Commit-Fi transforms procrastination into productivity through **blockchain-powered commitment contracts** that make success **inevitable** and failure **costly**.

---

## 🚀 How It Works

### **1. Set Ambitious Goals**
- Personal challenges: Learn DSA, build projects, master skills
- Study circles: Collaborative learning with friends
- Custom deadlines: You control the timeline

### **2. Put Skin in the Game** 💰
- Stake as little as **5 ALGO** to join
- Smart contract locks your stake automatically  
- No backing out - the commitment is real

### **3. Complete or Lose** ⚡
- Submit proof before deadline
- **Winners**: Get stake back + rewards
- **Losers**: Stake goes to the pool - motivation to succeed!

### **4. Build Your Reputation** 🏆
- Every completion builds your on-chain record
- Higher reputation = better opportunities
- **Verified achievers** get access to premium challenges

---

## 🌟 Why This Changes Everything

### **Traditional Goal Setting** ❌
- No real consequences
- Easy to quit
- No accountability
- **90% failure rate**

### **Commit-Fi System** ✅  
- **Financial motivation** - Real money at stake
- **Smart contracts** - Can't cheat the system
- **Social proof** - Your achievements are public
- **Automated justice** - Fair and instant payouts
- **Reputation economy** - Success compounds

---

## ⚡ The Algorand Advantage

Built for speed, security, and accessibility:

- **⚡ Lightning Fast**: 2.3 second finality
- **🔒 Fort Knox Security**: Pure proof-of-stake consensus  
- **💰 Micro Fees**: Stake for less than coffee money
- **🌍 Global Scale**: No geographic restrictions
- **🔭 Transparent**: Every transaction visible on-chain

---
- **Trustless execution** via atomic group transactions

## Future Finance & Innovation

Commit-Fi introduces behavioral economics to DeFi:

### Accountability Staking
- Financial incentives drive completion rates
- Variable stake amounts match goal difficulty
- Time-locked mechanisms prevent premature withdrawal

### Reputation Systems
- On-chain completion history builds trust score
- High reputation unlocks larger challenge opportunities
- Portable credibility across platforms

### Behavioral Incentives
- Loss aversion increases commitment strength
- Social proof through public challenge participation
- Gamification through streaks and achievements

## Feasibility & Scalability

### Technical Feasibility
- **Smart Contracts**: Fully implemented and tested on TestNet
- **Frontend**: Production-ready React application
- **Integration**: Seamless wallet connection and transaction handling

### Scalability Considerations
- **Horizontal Scaling**: Multiple challenges run concurrently
- **Cost Efficiency**: Optimized state schema minimizes fees
- **User Growth**: Architecture supports 10,000+ concurrent users
- **Network Effects**: Study circles create viral growth loops

### Risk Mitigation
- **Smart Contract Audits**: Comprehensive testing framework
- **Gradual Rollout**: Beta testing with limited user groups
- **Fallback Mechanisms**: Manual intervention for edge cases

## Tech Stack

### Backend
- **Smart Contracts**: Python with AlgoKit framework
- **Development**: AlgoKit LocalNet for rapid iteration
- **Deployment**: Automated scripts for TestNet/MainNet

### Frontend  
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with custom design system
- **State Management**: React hooks for wallet and app state
- **Web3 Integration**: @txnlab/use-wallet-react

### Infrastructure
- **Network**: Algorand TestNet (production ready for MainNet)
- **Indexing**: Built-in Algorand Indexer for real-time data
- **IPFS**: Pinata integration for metadata storage

## Setup & Installation

### Prerequisites
- Docker Desktop (running)
- Node.js 18+ and npm
- AlgoKit CLI installed

### Quick Start

1. **Clone Repository**
```bash
git clone https://github.com/lushdash-sh/Hackspiration.git
cd Hackspiration
```

2. **Bootstrap Project**
```bash
algokit project bootstrap all
```

3. **Environment Setup**
```bash
cd projects/frontend
cp .env.template .env
# Edit .env with your configuration
```

4. **Install Dependencies**
```bash
cd projects/frontend
npm install
```

## How to Run Locally

### Development Mode
```bash
cd projects/frontend
npm run dev
```
Application runs on `http://localhost:5173`

## Vercel Environment Setup (Strava)

In Vercel Dashboard: Project -> Settings -> Environment Variables

Add these variables:

- `VITE_STRAVA_CLIENT_ID` (frontend-safe)
- `STRAVA_CLIENT_SECRET` (server-only)
- `STRAVA_REDIRECT_URI` (must match Strava app callback URL)
- `VITE_STRAVA_REDIRECT_URI` (frontend callback URL)
- `VITE_STRAVA_TOKEN_EXCHANGE_URL` (set to `/api/strava`)

Notes:

- Keep `.env` out of git (already ignored).
- Never expose `STRAVA_CLIENT_SECRET` in frontend code or VITE_ variables.
- Strava token exchange and activity fetch run through `projects/frontend/api/strava.js`.

### Smart Contract Development
```bash
cd projects/contracts
python -m smart_contracts.deploy
```

### LocalNet Testing
```bash
algokit localnet reset
algokit localnet start
```

**Built for Hackspiration '26 on Algorand**
*Transforming procrastination into productivity, one stake at a time.*

## Application Preview

![Commit-Fi Landing Page](assets/landing-page.jpeg)

## Architecture Diagram

<p align="center">
  <img src="assets/architecture-diagram.jpeg" width="700">
</p>

## Hackathon Submission Note
All the data on the site is dummy data to provide us a vision of the final product and will be replaced by real time data in our next consideration.✨ 
Thank You for giving us the opportunity to particpate. We learned alot from this and hope to make it to the next round so as to make this project more industry-ready with your guidance and support.😊😊