
import { useState } from "react";
import { Sparkles, Check, RefreshCw } from "lucide-react";
import Modal from "./Modal.jsx";
import api from "../api/axios.js";

export default function HabitSuggestionModal({
  open,
  onClose,
  onAccept,
}) {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState("");
  const [productiveTime, setProductiveTime] = useState("");
  const [struggles, setStruggles] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState({});
  const [error, setError] = useState("");
  const [addingIndex, setAddingIndex] = useState(null);

  const reset = () => {
    setStep(0);
    setGoals("");
    setProductiveTime("");
    setStruggles("");
    setSuggestions([]);
    setAdded({});
    setError("");
    setLoading(false);
    setAddingIndex(null);
  };

  const close = () => {
    if (loading || addingIndex !== null) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/ai/suggest-habits", {
        goals: goals.trim(),
        productiveTime: productiveTime.trim(),
        struggles: struggles.trim(),
      });

      // Backend returns suggestions as an array directly.
      // Also support { suggestions: [...] } if the response format changes.
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.suggestions;

      if (!Array.isArray(data) || data.length === 0) {
        setSuggestions([]);
        setError("No suggestions returned. Please try again.");
        return;
      }

      setSuggestions(data);
      setStep(3);
    } catch (err) {
      console.error(
        "Suggest habit failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "Failed to generate suggestions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const accept = async (suggestion, idx) => {
    if (added[idx] || addingIndex !== null) return;

    setAddingIndex(idx);
    setError("");

    try {
      await onAccept(suggestion);
      setAdded((prev) => ({ ...prev, [idx]: true }));
    } catch (err) {
      console.error(
        "Add suggested habit failed:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to add this habit. Please try again."
      );
    } finally {
      setAddingIndex(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="AI Habit Suggestions"
      maxWidth="max-w-xl"
    >
      {step === 0 && (
        <div className="space-y-4">
          <div className="text-sm text-soft">
            Answer 3 quick questions and I'll suggest 3 personalised habits.
          </div>

          <div>
            <label className="label">
              What are your goals right now?
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. Get fitter, read more, reduce phone time..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={close}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(1)}
              disabled={!goals.trim()}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">
              When are you most productive during the day?
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. Early morning, late evenings..."
              value={productiveTime}
              onChange={(e) => setProductiveTime(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep(0)}
            >
              Back
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(2)}
              disabled={!productiveTime.trim()}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="label">
              What habits have you struggled with?
            </label>

            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. Gym in the morning, journaling at night..."
              value={struggles}
              onChange={(e) => setStruggles(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-rose-500" role="alert">
              {error}
            </div>
          )}

          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setError("");
                setStep(1);
              }}
              disabled={loading}
            >
              Back
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={loading || !struggles.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={14}
                    className="animate-spin"
                  />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Get suggestions
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {error && (
            <div className="text-sm text-rose-500" role="alert">
              {error}
            </div>
          )}

          {suggestions.length === 0 && (
            <div className="text-sm text-muted">
              No suggestions returned. Please try again.
            </div>
          )}

          {suggestions.map((s, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xl">{s.icon || "✨"}</span>

                <div className="font-medium">{s.name}</div>

                {s.category && (
                  <span className="chip">{s.category}</span>
                )}

                {s.frequency && (
                  <span className="chip">{s.frequency}</span>
                )}
              </div>

              {s.description && (
                <div className="text-sm text-soft">
                  {s.description}
                </div>
              )}

              {s.reason && (
                <div className="text-xs text-brand-700 dark:text-brand-300 mt-2 bg-brand-500/10 rounded-lg px-2 py-1.5">
                  Why: {s.reason}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                {added[i] ? (
                  <div className="text-sm text-emerald-500 flex items-center gap-1">
                    <Check size={14} />
                    Added
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => accept(s, i)}
                    disabled={addingIndex !== null}
                  >
                    {addingIndex === i ? (
                      <>
                        <RefreshCw
                          size={14}
                          className="animate-spin"
                        />
                        Adding...
                      </>
                    ) : (
                      "Add this habit"
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setError("");
                setSuggestions([]);
                setStep(2);
              }}
              disabled={addingIndex !== null}
            >
              Try again
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={close}
              disabled={addingIndex !== null}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
