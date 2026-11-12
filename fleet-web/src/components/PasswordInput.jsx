import { useState } from "react";

/** Password field with show/hide (eye) toggle. Admin-facing forms. */
export default function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  required = false,
  className = "",
  id,
  autoComplete = "new-password",
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        className="w-full border rounded-lg px-3 py-2 pr-11"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        minLength={6}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-500 hover:text-btt-navy hover:bg-slate-100"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" strokeLinecap="round" />
            <path d="M9.9 5.1A10.5 10.5 0 0121 12c-.6 1.1-1.4 2.1-2.4 3" strokeLinecap="round" />
            <path d="M6.1 6.1C4.4 7.4 3.1 9.1 2.2 12c1.8 4.5 6 7.5 9.8 7.5 1.4 0 2.7-.3 3.9-.9" strokeLinecap="round" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
            <path d="M2.2 12C4 7.5 8.2 4.5 12 4.5S20 7.5 21.8 12C20 16.5 15.8 19.5 12 19.5S4 16.5 2.2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
