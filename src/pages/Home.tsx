import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Code2, Users, Zap, BarChart3, GitBranch, BookOpen, ArrowRight, ChevronRight } from "lucide-react";

const features = [
  { icon: Users, title: "Real-Time Collaboration", desc: "Code together with your team in real-time with cursor sharing and live updates." },
  { icon: Zap, title: "AI Code Optimization", desc: "Get intelligent suggestions to improve performance and code quality." },
  { icon: BarChart3, title: "Performance Analysis", desc: "Measure cyclomatic complexity, time complexity, and risk levels." },
  { icon: GitBranch, title: "Version Control", desc: "Save, compare, and revert code versions with built-in history." },
  { icon: BookOpen, title: "Learning Recommendations", desc: "Personalized tips on algorithms, patterns, and Java best practices." },
];

const steps = [
  { num: "01", title: "Create Workspace", desc: "Set up a new coding room and invite collaborators." },
  { num: "02", title: "Write Java Code", desc: "Use the Monaco editor with syntax highlighting and IntelliSense." },
  { num: "03", title: "Analyze & Optimize", desc: "Run AI analysis to find issues and optimize performance." },
];

const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const inviteToken = (searchParams.get("inviteToken") ?? "").trim();
    if (inviteToken) {
      navigate(`/invite?token=${encodeURIComponent(inviteToken)}`, { replace: true });
      return;
    }

    const resetToken = (searchParams.get("resetToken") ?? "").trim();
    if (resetToken) {
      navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`, { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar showAuth={false}>
        <div className="flex-1" />
        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-xs">Log In</Button>
        </Link>
        <Link to="/signup">
          <Button size="sm" className="text-xs">Sign Up</Button>
        </Link>
      </Navbar>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
            <Code2 className="h-3.5 w-3.5" /> Intelligent Java Development
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
            Collaborative Intelligent
            <span className="text-gradient-primary block">Java Workspace</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Real-time collaborative Java coding with intelligent optimization, static analysis, and version history.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Start Coding <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/workspace/demo">
              <Button variant="outline" size="lg">View Demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Powerful Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="stat-card group">
                <f.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-foreground mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="text-3xl font-extrabold text-primary/20 mb-2">{s.num}</div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Collaborative Java Workspace</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
            <span>University Project © 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
