import { createFileRoute } from "@tanstack/react-router";
import { Brain, Check, Coins, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Daily Space Quiz — SSRA" },
      { name: "description", content: "Five new space questions every day. Score 4 or more to earn space tokens." },
      { property: "og:title", content: "Daily Space Quiz — SSRA" },
      { property: "og:description", content: "Test your space knowledge daily and earn tokens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuizPage,
});

const REWARD = 300;
const PASS = 4;

type Q = { q: string; a: string[]; c: number };
const POOL: Q[] = [
  { q: "Which planet has the most known moons?", a: ["Jupiter", "Saturn", "Uranus", "Neptune"], c: 1 },
  { q: "How long does sunlight take to reach Earth?", a: ["8 seconds", "8 minutes", "8 hours", "1 day"], c: 1 },
  { q: "What is the hottest planet in our solar system?", a: ["Mercury", "Mars", "Venus", "Jupiter"], c: 2 },
  { q: "Who was the first human in space?", a: ["Neil Armstrong", "Yuri Gagarin", "Buzz Aldrin", "Alan Shepard"], c: 1 },
  { q: "Roughly how often does the ISS orbit Earth?", a: ["Every 24 h", "Every 12 h", "Every 92 min", "Every 5 min"], c: 2 },
  { q: "What is the largest volcano in the solar system?", a: ["Mauna Kea", "Olympus Mons", "Etna", "Maxwell Montes"], c: 1 },
  { q: "Which galaxy is closest to the Milky Way (large spiral)?", a: ["Andromeda", "Sombrero", "Whirlpool", "Triangulum"], c: 0 },
  { q: "What is a light-year a measure of?", a: ["Time", "Distance", "Brightness", "Speed"], c: 1 },
  { q: "Which planet rotates on its side?", a: ["Neptune", "Uranus", "Saturn", "Venus"], c: 1 },
  { q: "India's first Mars mission was called?", a: ["Chandrayaan", "Mangalyaan", "Gaganyaan", "Aditya"], c: 1 },
  { q: "What is the Sun mostly made of?", a: ["Oxygen", "Helium", "Hydrogen", "Carbon"], c: 2 },
  { q: "Which telescope launched in 2021 sees in infrared?", a: ["Hubble", "Kepler", "James Webb", "Spitzer"], c: 2 },
  { q: "How many planets are in our solar system?", a: ["7", "8", "9", "10"], c: 1 },
  { q: "The Great Red Spot is a storm on?", a: ["Mars", "Saturn", "Jupiter", "Neptune"], c: 2 },
  { q: "Which moon has thick orange haze and methane lakes?", a: ["Europa", "Titan", "Io", "Ganymede"], c: 1 },
  { q: "First crewed Moon landing year?", a: ["1961", "1965", "1969", "1972"], c: 2 },
];

function todaysQuestions(): Q[] {
  const day = Math.floor(Date.now() / 86_400_000);
  return Array.from({ length: 5 }, (_, i) => POOL[(day * 5 + i * 7) % POOL.length]!);
}

function QuizPage() {
  const questions = useMemo(todaysQuestions, []);
  const { identity, claimed, claim } = useWallet();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const score = answers.filter((a, i) => a === questions[i]!.c).length;
  const done = claimed.includes("quiz");

  const claimReward = async () => {
    try {
      const bal = await claim.mutateAsync({ id: "quiz", title: "Daily quiz", detail: "", tokens: REWARD });
      toast.success(`+${REWARD} tokens — balance ${bal.toLocaleString()}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim.");
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary">
          <Brain className="h-3.5 w-3.5" /> New questions daily
        </span>
        <h1 className="mt-5 text-4xl font-bold sm:text-5xl">
          Daily <span className="neon-text">space quiz</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Get {PASS} of 5 right to earn {REWARD} space tokens — once a day.
        </p>
      </Reveal>

      <div className="mt-8 space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="glass-panel p-5">
            <p className="font-semibold">
              {qi + 1}. {q.q}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.a.map((opt, oi) => {
                const picked = answers[qi] === oi;
                const right = submitted && oi === q.c;
                const wrong = submitted && picked && oi !== q.c;
                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    className={`glass-inset flex items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                      picked ? "ring-2 ring-primary" : ""
                    } ${right ? "ring-2 ring-accent" : ""} ${wrong ? "ring-2 ring-destructive" : ""}`}
                  >
                    {opt}
                    {right && <Check className="h-4 w-4 text-accent" />}
                    {wrong && <X className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        {submitted ? (
          <p className="font-display text-xl font-bold">
            Score: <span className="neon-text">{score}/5</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Answer all five, then check.</p>
        )}
        {!submitted ? (
          <Button className="gradient-neon text-primary-foreground" disabled={answers.includes(null)} onClick={() => setSubmitted(true)}>
            Check answers
          </Button>
        ) : score >= PASS ? (
          <Button
            className="gradient-neon text-primary-foreground"
            disabled={done || claim.isPending || identity.kind === "visitor"}
            onClick={claimReward}
          >
            <Coins className="mr-1.5 h-4 w-4" />
            {done ? "Claimed today" : identity.kind === "visitor" ? "Sign in to claim" : `Claim ${REWARD} tokens`}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => { setSubmitted(false); setAnswers(Array(5).fill(null)); }}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
