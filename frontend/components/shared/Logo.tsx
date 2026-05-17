import { BookOpen } from 'lucide-react'

const Logo = () => {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold">LibraIQ</h1>
                <p className="text-xs text-muted-foreground">Library Management System</p>
            </div>
        </div>
    )
}

export default Logo