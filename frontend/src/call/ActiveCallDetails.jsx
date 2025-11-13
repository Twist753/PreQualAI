import AssistantSpeechIndicator from "./AssistantSpeechIndicator";
import VolumeLevel from "./VolumeLevel";

const ActiveCallDetails = ({ assistantIsSpeaking, volumeLevel, callId }) => {
  return (
    <div className="active-call-surface">
      <div className="call-status">
        <AssistantSpeechIndicator isSpeaking={assistantIsSpeaking} />
        <dl className="call-meta">
          <dt className="meta-label">Session ID</dt>
          <dd className="meta-value">{callId || "Pending..."}</dd>
        </dl>
      </div>
      <VolumeLevel volume={volumeLevel} />
    </div>
  );
};

export default ActiveCallDetails;
