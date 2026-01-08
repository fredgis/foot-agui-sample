interface ClubInfoProps {
  clubData: {
    name: string;
    founded: string;
    stadium: string;
    capacity: string;
    country: string;
    countryFlag: string;
    titles: string[];
    legends: Array<{ name: string; position: string; years: string }>;
    history: string;
    colors: string;
  } | null;
  themeColor: string;
}

export function ClubInfoCard({ clubData, themeColor }: ClubInfoProps) {
  if (!clubData) {
    return (
      <div 
        className="w-full max-w-4xl p-8 rounded-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <div className="text-center text-gray-500 text-lg">
          🏟️ Parlez d'un club pour découvrir son histoire !
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full max-w-6xl p-8 rounded-2xl backdrop-blur-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: `0 8px 32px ${themeColor}60`,
        border: `2px solid ${themeColor}`,
        animation: 'slideIn 0.6s ease-out',
      }}
    >
      {/* En-tête avec infos principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div 
          className="text-center p-4 rounded-xl"
          style={{ background: `${themeColor}15` }}
        >
          <div className="text-3xl mb-2">🏛️</div>
          <div className="text-sm text-gray-600">Fondé en</div>
          <div className="text-2xl font-bold" style={{ color: themeColor }}>{clubData.founded}</div>
        </div>
        
        <div 
          className="text-center p-4 rounded-xl"
          style={{ background: `${themeColor}15` }}
        >
          <div className="text-3xl mb-2">🏟️</div>
          <div className="text-sm text-gray-600">Stade</div>
          <div className="text-lg font-bold" style={{ color: themeColor }}>{clubData.stadium}</div>
          <div className="text-sm text-gray-500">{clubData.capacity} places</div>
        </div>

        <div 
          className="text-center p-4 rounded-xl"
          style={{ background: `${themeColor}15` }}
        >
          <div className="text-3xl mb-2">🎨</div>
          <div className="text-sm text-gray-600">Couleurs</div>
          <div className="text-lg font-bold" style={{ color: themeColor }}>{clubData.colors}</div>
        </div>

        <div 
          className="text-center p-4 rounded-xl"
          style={{ background: `${themeColor}15` }}
        >
          <div className="text-3xl mb-2">🌍</div>
          <div className="text-sm text-gray-600">Pays</div>
          <div className="text-lg font-bold" style={{ color: themeColor }}>{clubData.country}</div>
        </div>
      </div>

      {/* Histoire du club */}
      <div className="mb-8">
        <h3 
          className="text-2xl font-bold mb-4 flex items-center gap-2"
          style={{ color: themeColor }}
        >
          📜 Histoire
        </h3>
        <p className="text-gray-700 text-lg leading-relaxed">
          {clubData.history}
        </p>
      </div>

      {/* Palmarès */}
      <div className="mb-8">
        <h3 
          className="text-2xl font-bold mb-4 flex items-center gap-2"
          style={{ color: themeColor }}
        >
          🏆 Palmarès
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clubData.titles?.map((title, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: `${themeColor}10` }}
            >
              <span className="text-2xl">🏅</span>
              <span className="text-gray-800 font-medium">{title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Légendes du club */}
      <div>
        <h3 
          className="text-2xl font-bold mb-4 flex items-center gap-2"
          style={{ color: themeColor }}
        >
          ⭐ Légendes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clubData.legends?.map((legend, index) => (
            <div 
              key={index}
              className="p-4 rounded-xl text-center transform transition-transform hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${themeColor}20, ${themeColor}05)`,
                border: `1px solid ${themeColor}40`,
              }}
            >
              <div className="text-4xl mb-2">⚽</div>
              <div className="font-bold text-lg mb-1" style={{ color: themeColor }}>
                {legend.name}
              </div>
              <div className="text-sm text-gray-600">{legend.position}</div>
              <div className="text-xs text-gray-500 mt-1">{legend.years}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
