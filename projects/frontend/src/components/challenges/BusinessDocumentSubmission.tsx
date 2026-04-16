import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db, storage } from '../../utils/Firebase'
import { ref, uploadBytes } from 'firebase/storage'

interface BusinessDocumentSubmissionProps {
  challengeId: string
  companyBAddress: string
  reviewPeriodHours: number
  onSubmitSuccess: () => void
}

const BusinessDocumentSubmission = ({
  challengeId,
  companyBAddress,
  reviewPeriodHours,
  onSubmitSuccess,
}: BusinessDocumentSubmissionProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [documentHash, setDocumentHash] = useState<string | null>(null)

  const calculateSHA256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)

      try {
        const hash = await calculateSHA256(selectedFile)
        setDocumentHash(hash)
      } catch (error) {
        alert('Error calculating file hash: ' + (error as Error).message)
      }
    }
  }

  const handleSubmit = async () => {
    if (!file || !documentHash) {
      alert('Please select a file')
      return
    }

    if (!description.trim()) {
      alert('Please provide a description of the deliverable')
      return
    }

    setLoading(true)

    try {
      const fileRef = ref(storage, `business-deliverables/${challengeId}/${file.name}`)
      await uploadBytes(fileRef, file)

      const now = Math.floor(Date.now() / 1000)
      const reviewEndTimestamp = now + reviewPeriodHours * 3600

      await updateDoc(doc(db, 'challenges', challengeId), {
        verificationStatus: 'in-review',
        documentHash: documentHash,
        documentFileName: file.name,
        documentSize: file.size,
        documentMimeType: file.type,
        submissionTimestamp: Date.now(),
        submissionDescription: description,
        companyBAddress: companyBAddress,
        reviewStartTimestamp: now,
        reviewEndTimestamp: reviewEndTimestamp,
        companyADecision: null,
      })

      alert(`Document submitted successfully!\nHash: ${documentHash}\nReview period: ${reviewPeriodHours} hours`)
      onSubmitSuccess()
    } catch (error) {
      alert('Submission failed: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-cyber-dark/40 border border-neon-green/30 rounded-xl p-8 max-w-2xl mx-auto">
      <h2 className="text-3xl font-cyber text-neon-green mb-6">SUBMIT DELIVERABLE</h2>

      <div className="space-y-6">
        {/* FILE UPLOAD */}
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-3">Upload Document</label>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
              accept=".pdf,.doc,.docx,.txt,.zip,.pptx"
            />
            <label
              htmlFor="file-input"
              className="flex items-center justify-center w-full border-2 border-dashed border-neon-green/40 rounded-lg p-8 cursor-pointer hover:border-neon-green/60 transition-all"
            >
              <div className="text-center">
                <div className="text-neon-green text-4xl mb-2">📄</div>
                <p className="text-gray-400 font-mono text-sm">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-gray-600 text-xs mt-1">PDF, DOC, ZIP, PPT up to 100MB</p>
              </div>
            </label>
          </div>
        </div>

        {/* SHA-256 HASH DISPLAY */}
        {documentHash && (
          <div className="bg-black/40 border border-neon-blue/30 rounded-lg p-4">
            <div className="text-gray-400 font-mono text-xs uppercase mb-2">SHA-256 Hash</div>
            <div className="bg-black/60 p-3 rounded border border-gray-700 font-mono text-xs text-neon-blue break-all">
              {documentHash}
            </div>
            <p className="text-gray-500 text-xs mt-2">This hash proves document authenticity on-chain</p>
          </div>
        )}

        {/* DESCRIPTION */}
        <div>
          <label className="block text-gray-400 font-mono text-xs uppercase mb-2">Deliverable Description</label>
          <textarea
            className="w-full bg-black/40 border border-gray-700 rounded p-4 text-white focus:border-neon-green outline-none font-mono h-24 resize-none"
            placeholder="Describe what you're submitting and confirm it meets the requirements..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* REVIEW PERIOD INFO */}
        <div className="p-4 border border-neon-green/20 rounded-lg bg-black/30">
          <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-2">Review Period</h3>
          <p className="text-gray-300 text-sm font-mono mb-2">
            After submission, Company A has <span className="text-neon-green font-bold">{reviewPeriodHours} hours</span> to:
          </p>
          <ul className="space-y-1 text-gray-300 text-sm font-mono">
            <li className="flex gap-2">
              <span className="text-neon-green">✓</span>
              <span>Accept the deliverable (automatic refund if no action)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neon-pink">✗</span>
              <span>Reject if document is fake/incomplete (initiates manual dispute)</span>
            </li>
          </ul>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full py-4 bg-gradient-to-r from-neon-green to-neon-blue text-black font-bold font-mono uppercase tracking-wider rounded shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_40px_rgba(0,255,136,0.6)] transition-all disabled:opacity-50"
        >
          {loading ? 'SUBMITTING...' : 'SUBMIT DELIVERABLE'}
        </button>
      </div>
    </div>
  )
}

export default BusinessDocumentSubmission
