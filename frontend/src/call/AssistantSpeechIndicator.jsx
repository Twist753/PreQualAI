const AssistantSpeechIndicator = ({ isSpeaking }) => (
  <div
    className={`assistant-speech-indicator ${
      isSpeaking ? "speech-speaking" : "speech-idle"
    }`}
  >
    <div className="speech-wave">
      <span />
      <span />
      <span />
    </div>
    <div className="speech-copy">
      <p className="speech-title">
        {isSpeaking ? "Assistant Live" : "Assistant Listening"}
      </p>
      <p className="speech-subtitle">
        {isSpeaking
          ? "Delivering the next prompt to the candidate."
          : "Waiting for the candidate's response."}
      </p>
    </div>
  </div>
);

export default AssistantSpeechIndicator;
