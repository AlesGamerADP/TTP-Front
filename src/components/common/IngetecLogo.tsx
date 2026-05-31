export function IngetecLogo({ className = "w-auto h-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {/* Graphic Element */}
      <div className="relative flex-shrink-0">
        {/* Main square with rounded corners */}
        <div 
          className="w-20 h-20 rounded-xl relative overflow-hidden shadow-lg"
          style={{ background: '#212B55' }}
        >
          {/* Yellow diagonal strips */}
          <div 
            className="absolute top-0 left-0 w-10 h-4 transform rotate-45 origin-top-left -translate-x-1 translate-y-1"
            style={{ background: '#FDC800' }}
          />
          <div 
            className="absolute bottom-0 right-0 w-10 h-4 transform rotate-45 origin-bottom-right translate-x-1 -translate-y-1"
            style={{ background: '#FDC800' }}
          />
          {/* Abstract curved shape coming from top-right - stylized wrench/fluid */}
          <svg 
            className="absolute -top-2 -right-2 w-14 h-14"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 28 4 Q 42 12 48 28 Q 52 44 40 50 Q 28 56 12 50"
              stroke="#212B55"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 32 8 Q 44 16 46 30 Q 48 42 38 46"
              stroke="#212B55"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <div className="text-4xl font-bold tracking-tight leading-tight">
          <span style={{ color: '#FDC800' }}>INGE</span>
          <span style={{ color: '#212B55' }}>TEC</span>
        </div>
        <div 
          className="text-xs font-semibold tracking-wider uppercase mt-1"
          style={{ color: '#212B55', letterSpacing: '0.1em' }}
        >
          HYDRAULIC SYSTEMS
        </div>
      </div>
    </div>
  );
}

