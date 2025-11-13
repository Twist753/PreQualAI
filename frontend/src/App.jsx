import { useEffect, useRef, useState } from "react";
import { startAssistant, stopAssistant, vapi } from "./ai";
import ActiveCallDetails from "./call/ActiveCallDetails";
import ResultSummary from "./components/ResultSummary";

function App() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [callId, setCallId] = useState("");
  const [callResult, setCallResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  const pollTimeoutRef = useRef(null);

  useEffect(() => {
    vapi
      .on("call-start", () => {
        setLoading(false);
        setStarted(true);
      })
      .on("call-end", () => {
        setStarted(false);
        setLoading(false);
      })
      .on("speech-start", () => {
        setAssistantIsSpeaking(true);
      })
      .on("speech-end", () => {
        setAssistantIsSpeaking(false);
      })
      .on("volume-level", (level) => {
        setVolumeLevel(level);
      });

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (setter) => (event) => {
    setter(event.target.value);
  };

  const handleStart = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await startAssistant(
        firstName,
        lastName,
        email,
        phoneNumber
      );
      if (data?.id) {
        setCallId(data.id);
      } else {
        throw new Error("Unable to start the assistant. Missing call id.");
      }
    } catch (error) {
      setLoading(false);
      setErrorMessage(
        error?.message || "Unable to start the assistant. Please try again."
      );
    }
  };

  const handleStop = () => {
    stopAssistant();
    if (callId) {
      getCallDetails();
    }
  };

  const handleReset = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setCallResult(null);
    setStarted(false);
    setCallId("");
    setVolumeLevel(0);
    setAssistantIsSpeaking(false);
    setLoading(false);
    setLoadingResult(false);
    setErrorMessage("");
  };

  const getCallDetails = (interval = 3000) => {
    if (!callId) return;

    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }

    setLoadingResult(true);
    fetch("/call-details?call_id=" + callId)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }

        if (data.analysis && data.summary) {
          setCallResult(data);
          setLoadingResult(false);
        } else {
          pollTimeoutRef.current = setTimeout(
            () => getCallDetails(interval),
            interval
          );
        }
      })
      .catch((error) => {
        setErrorMessage(
          error?.message ||
            "We ran into a problem fetching the interview results."
        );
        setLoadingResult(false);
      });
  };

  const showForm =
    !loading && !started && !loadingResult && !callResult && !errorMessage;
  const allFieldsFilled = firstName && lastName && email && phoneNumber;

  return (
    <div className="app-frame">
      <div className="abstract-backdrop" />
      <main className="app-main">
        <header className="site-header">
          <h1 className="site-title">TwistTech PreQual AI</h1>
          <p className="site-subtitle">
            Voice-led screenings with structured insights, tailored for TwistTech.
          </p>
        </header>

        {errorMessage && (
          <div className="panel error-panel">
            <p>{errorMessage}</p>
            <button onClick={handleReset} className="outline-button">
              Reset Session
            </button>
          </div>
        )}

        {showForm && (
          <section className="panel intake-panel">
            <h2>Candidate Intake</h2>
            <p className="panel-description">
              Enter candidate basics and launch the live voice interview.
            </p>
            <form
              className="intake-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!loading) {
                  handleStart();
                }
              }}
            >
              <label className="form-field">
                <span>First Name</span>
                <input
                  type="text"
                  placeholder="Aarav"
                  value={firstName}
                  onChange={handleInputChange(setFirstName)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Last Name</span>
                <input
                  type="text"
                  placeholder="Patel"
                  value={lastName}
                  onChange={handleInputChange(setLastName)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="aarav.patel@email.com"
                  value={email}
                  onChange={handleInputChange(setEmail)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Phone</span>
                <input
                  type="tel"
                  placeholder="+91 99887 66554"
                  value={phoneNumber}
                  onChange={handleInputChange(setPhoneNumber)}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={!allFieldsFilled || loading}
                className="primary-button"
              >
                {loading ? "Connecting..." : "Start Interview"}
              </button>
            </form>
          </section>
        )}

        {loading && !started && (
          <div className="panel loading-panel">
            <div className="ring-loader" />
            <p>Connecting to the assistant...</p>
          </div>
        )}

        {started && (
          <section className="panel live-panel">
            <header>
              <h2>Interview In Progress</h2>
              <p>Monitor the assistant activity while the conversation runs.</p>
            </header>
            <ActiveCallDetails
              assistantIsSpeaking={assistantIsSpeaking}
              volumeLevel={volumeLevel}
              callId={callId}
            />
          </section>
        )}

        {loadingResult && (
          <div className="panel loading-panel">
            <div className="ring-loader" />
            <p>Digesting the interview and compiling your report...</p>
          </div>
        )}

        {!loadingResult && callResult && (
          <ResultSummary result={callResult} onReset={handleReset} />
        )}
      </main>

      {started && (
        <button className="end-call-fixed" onClick={handleStop}>
          End Interview
        </button>
      )}
    </div>
  );
}

export default App;
