interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: string
  color?: 'blue' | 'green' | 'red' | 'purple'
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-900 border-blue-200',
  green: 'bg-green-50 text-green-900 border-green-200',
  red: 'bg-red-50 text-red-900 border-red-200',
  purple: 'bg-purple-50 text-purple-900 border-purple-200',
}

const iconClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
}

export default function StatCard({
  label,
  value,
  subtext,
  trend,
  icon,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtext && <p className="text-xs opacity-60 mt-1">{subtext}</p>}
        </div>
        {icon && <span className={`text-3xl ${iconClasses[color]}`}>{icon}</span>}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {trend === 'up' && <span className="text-green-600">↑ Positive</span>}
          {trend === 'down' && <span className="text-red-600">↓ Negative</span>}
          {trend === 'neutral' && <span className="text-gray-600">→ Neutral</span>}
        </div>
      )}
    </div>
  )
}
