type ChallengeCategory = 'academics' | 'fitness'

interface ChallengeTypeToggleProps {
  selectedCategory: ChallengeCategory
  onChange: (category: ChallengeCategory) => void
}

const ChallengeTypeToggle = ({ selectedCategory, onChange }: ChallengeTypeToggleProps) => {
  const options: Array<{ id: ChallengeCategory; label: string }> = [
    { id: 'academics', label: 'Academics' },
    { id: 'fitness', label: 'Fitness & Diet' },
  ]

  return (
    <div className="mb-8">
      <div className="w-full bg-black/40 border border-neon-green/30 rounded-xl p-1.5 flex gap-2 backdrop-blur-md">
        {options.map((option) => {
          const selected = selectedCategory === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex-1 py-3 px-4 rounded-lg font-mono text-sm uppercase tracking-widest transition-all duration-300 ${
                selected
                  ? 'bg-gradient-to-r from-neon-green to-neon-blue text-cyber-black shadow-[0_0_20px_rgba(0,255,136,0.35)]'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ChallengeTypeToggle
