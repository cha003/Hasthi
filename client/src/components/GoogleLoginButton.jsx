// client/src/components/GoogleLoginButton.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthProvider";

export default function GoogleLoginButton() {
  const btnRef = useRef(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = () => {
      /* global google */
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          try {
            const { data } = await client.post("/auth/google", { credential: resp.credential });
            setUser(data.user);
            navigate("/");
          } catch (e) {
            console.error(e);
            alert(e?.response?.data?.message || "Google sign-in failed");
          }
        },
        ux_mode: "popup" // or "redirect"
      });

      // Render a “Sign in with Google” button
      google.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill"
      });

      // Optional: One Tap prompt
      google.accounts.id.prompt();
    };

    // load GIS script once if not present
    if (window.google && window.google.accounts) {
      initialize();
    } else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = initialize;
      document.body.appendChild(s);
    }
  }, [navigate, setUser]);

  return <div ref={btnRef} />;
}
