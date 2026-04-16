<p align="center">
  <img src="https://github.com/user-attachments/assets/08c940af-a766-4e68-9ac8-1123cac1c7fe" width="600"/>
</p>

## 🎯 Commit-Fi:
Turn Your Goals into Guaranteed SuccessStop procrastinating. Start achieving. With real skin in the game.What if every goal came with real consequences? What if your ambition was backed by actual money? Commit-Fi transforms procrastination into productivity through blockchain-powered commitment contracts that make success inevitable and failure costly.

### 🚀 How It Works:
1.Set Ambitious GoalsPersonal challenges: Learn DSA, build projects, master skills.Study circles: Collaborative learning with friends.Custom deadlines: You control the timeline.

2. Put Skin in the Game 💰Stake as little as 5 ALGO to join.A smart contract locks your stake automatically.No backing out—the commitment is real.
   
3. Complete or Lose⚡Submit proof before the deadline.Winners: Get their stake back + rewards.Losers: Stake goes to the pool (ultimate motivation to succeed!).
   
4. Build Your Reputation 🏆Every completion builds your on-chain record.Higher reputation = better opportunities.Verified achievers get access to premium challenges.

### 🌟 Why This Changes Everything:
Traditional Goal Setting The Commit-Fi System  No real consequencesFinancial motivation - Real money at stakeEasy to quitSmart contracts - You can't cheat the systemNo accountabilitySocial proof - Your achievements are public90% failure rateAutomated justice - Fair and instant payoutsNo lasting rewardReputation economy - Success compounds.

### ⚡ The Algorand Advantage:
Built for speed, security, and accessibility:Lightning Fast: 2.3-second finality.Fort Knox Security: Pure proof-of-stake consensus.Micro Fees: Stake for less than coffee money.Global Scale: No geographic restrictions.Transparent: Every transaction is visible on-chain.Trustless Execution: Powered by atomic group transactions.

### 🏗️ Architecture & Tech StackBackend & Smart ContractsLanguage:
Python with AlgoKit frameworkDevelopment: AlgoKit LocalNet for rapid iterationDeployment: Automated scripts for TestNet/MainNetFrontendFramework: React 18 with TypeScriptStyling: TailwindCSS with a custom design systemWeb3 Integration: @txnlab/use-wallet-reactInfrastructureNetwork: Algorand TestNet (Production ready for MainNet)Indexing: Built-in Algorand Indexer for real-time dataStorage: IPFS (Pinata integration) for metadata

### 🛠️ Setup & Installation
Prerequisites
Docker 
Desktop (running)
Node.js 18+ and
npmAlgoKit CLI installedQuick 

#### 1.Clone Repo
git clone https://github.com/lushdash-sh/Hackspiration.git
cd Hackspiration

#### 2. Bootstrap Project
algokit project bootstrap all

 #### 3. Environment Setup
cd projects/frontend
cp .env.template .env
Edit .env with your configuration

#### 4. Install Dependencies
npm install

#### 5. Run Locally
npm run dev
Application runs on http://localhost:5173

### Smart Contract Testing
 #### Deploy Contracts
cd projects/contracts
python -m smart_contracts.deploy

#### LocalNet Testing
algokit localnet reset
algokit localnet start

### 🌐 Vercel Environment Setup
(Strava Integration)
To properly configure the Strava API on Vercel, navigate to Project -> Settings -> Environment Variables and add the following:VITE_STRAVA_CLIENT_ID (Frontend-safe)STRAVA_CLIENT_SECRET (Server-only)STRAVA_REDIRECT_URI (Must match Strava app callback URL)VITE_STRAVA_REDIRECT_URI (Frontend callback URL)VITE_STRAVA_TOKEN_EXCHANGE_URL (Set to /api/strava)

### ⚠️ Important Security Notes:
Keep .env out of git (already ignored).Never expose STRAVA_CLIENT_SECRET in frontend code or VITE_ variables.Strava token exchange and activity fetching run securely through projects/frontend/api/strava.js.

### 📸 Application Preview & Architecture
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/c75d4d55-fa8a-4ed3-992a-5b3e9ea663f2" />
<img width="1600" height="773" alt="WhatsApp Image 2026-04-16 at 10 43 23 PM" src="https://github.com/user-attachments/assets/b4f08cad-0fe3-400f-af95-6706501519da" />
<img width="1600" height="771" alt="WhatsApp Image 2026-04-16 at 10 43 51 PM" src="https://github.com/user-attachments/assets/82433f96-9350-4509-9309-fdbe9330924e" />
<img width="1600" height="763" alt="WhatsApp Image 2026-04-16 at 10 44 06 PM" src="https://github.com/user-attachments/assets/4e20cf9b-eeb1-444e-8a3d-55bfa4324a9f" />

### 🤝 Contributing & Community
Commit-Fi is an open-source protocol, and we welcome contributions from the community! Whether you want to add a new oracle integration (like Duolingo or GitHub), improve the smart contracts, or squash bugs on the frontend, we'd love your help.
Fork the repository
Create your feature branch: git checkout -b feature/AmazingFeature
Commit your changes: git commit -m 'Add some AmazingFeature'
Push to the branch: git push origin feature/AmazingFeature
Open a Pull Request
If you have questions, feature requests, or just want to discuss the future of accountability protocols, feel free to open an Issue or start a Discussion in the repository.

