const VolumeLevel = ({ volume }) => {
  const boundedVolume = Math.max(0, Math.min(volume, 1));
  const barCount = 24;

  return (
    <div className="volume-meter" aria-label="Assistant audio activity">
      <div className="meter-bars">
        {Array.from({ length: barCount }, (_, index) => {
          const relative = index / barCount;
          const ease = Math.sin(Math.PI * relative);
          const height = 12 + ease * 72 * (0.35 + boundedVolume);

          return (
            <span
              key={index}
              className={`meter-bar ${boundedVolume > relative ? "active" : ""}`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
      <div className="meter-caption">
        <span>Assistant output level</span>
        <span>{Math.round(boundedVolume * 100)}%</span>
      </div>
    </div>
  );
};

export default VolumeLevel;
