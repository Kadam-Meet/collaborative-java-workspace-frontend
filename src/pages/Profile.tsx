import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bell, MapPin, Palette, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { updateMeApi } from "@/api/authApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getUserFriendlyErrorMessage } from "@/hooks/useToast";

const accentOptions = [
  { value: "emerald", label: "Emerald", classes: "from-emerald-500 to-teal-400" },
  { value: "ocean", label: "Ocean", classes: "from-sky-500 to-cyan-400" },
  { value: "sunset", label: "Sunset", classes: "from-orange-500 to-amber-400" },
  { value: "rose", label: "Rose", classes: "from-rose-500 to-pink-400" },
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    headline: "",
    location: "",
    bio: "",
    accentColor: "emerald",
    profilePublic: true,
    emailNotifications: true,
    workspaceDigest: false,
    focusModeEnabled: false,
    password: "",
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      name: user.name,
      headline: user.headline ?? "",
      location: user.location ?? "",
      bio: user.bio ?? "",
      accentColor: user.accentColor ?? "emerald",
      profilePublic: user.profilePublic,
      emailNotifications: user.emailNotifications,
      workspaceDigest: user.workspaceDigest,
      focusModeEnabled: user.focusModeEnabled,
      password: "",
    });
  }, [user]);

  const accent = useMemo(
    () => accentOptions.find((option) => option.value === form.accentColor) ?? accentOptions[0],
    [form.accentColor]
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const nextUser = await updateMeApi({
        name: form.name.trim(),
        headline: form.headline.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        accentColor: form.accentColor,
        profilePublic: form.profilePublic,
        emailNotifications: form.emailNotifications,
        workspaceDigest: form.workspaceDigest,
        focusModeEnabled: form.focusModeEnabled,
        password: form.password.trim() || undefined,
      });
      updateUser(nextUser);
      setForm((current) => ({ ...current, password: "" }));
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, "Unable to update your profile"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <section className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${accent.classes} p-[1px] shadow-xl`}>
          <div className="rounded-[calc(1.5rem-1px)] bg-background/95 p-6 md:p-8">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute -top-10 right-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-white/20 blur-3xl" />
            </div>
            <div className="relative grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Personal profile studio
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{form.name || user.name}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {form.headline || "Shape how your workspace identity looks and feels for collaborators."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1">
                    <UserRound className="h-4 w-4 text-primary" />
                    {user.email}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    {form.location || "Add your location"}
                  </span>
                </div>
              </div>

              <Card className="border-border/70 bg-card/90 shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${accent.classes} text-2xl font-bold text-white shadow-lg`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Profile quick view</p>
                      <p className="text-sm text-muted-foreground">{form.bio || "A short bio helps teammates understand your role and interests."}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                          {form.profilePublic ? "Public profile" : "Private profile"}
                        </span>
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent-foreground">
                          {form.focusModeEnabled ? "Focus mode on" : "Focus mode off"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm font-semibold text-foreground">Profile details</p>
                  <p className="text-sm text-muted-foreground">This is the main profile information other collaborators will recognize.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Display name</span>
                    <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <Input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="City, country" />
                  </label>
                </div>
                <label className="space-y-2 text-sm block">
                  <span className="text-muted-foreground">Headline</span>
                  <Input
                    value={form.headline}
                    onChange={(event) => updateField("headline", event.target.value)}
                    placeholder="Senior Java learner, backend builder, testing enthusiast..."
                  />
                </label>
                <label className="space-y-2 text-sm block">
                  <span className="text-muted-foreground">Bio</span>
                  <Textarea
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    placeholder="Share what you are building, what you enjoy, or how teammates can collaborate with you."
                    className="min-h-32"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Customizable UI</p>
                    <p className="text-sm text-muted-foreground">Choose a profile accent to give your card a distinct look.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {accentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("accentColor", option.value)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        form.accentColor === option.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className={`mb-3 h-12 rounded-xl bg-gradient-to-br ${option.classes}`} />
                      <p className="text-sm font-semibold text-foreground">{option.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    <p className="text-sm text-muted-foreground">Fine-tune what comes back to you while you work.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Email notifications</p>
                      <p className="text-sm text-muted-foreground">Receive important updates about rooms and invites.</p>
                    </div>
                    <Switch checked={form.emailNotifications} onCheckedChange={(value) => updateField("emailNotifications", value)} />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Workspace digest</p>
                      <p className="text-sm text-muted-foreground">Get a recap of activity and recent changes.</p>
                    </div>
                    <Switch checked={form.workspaceDigest} onCheckedChange={(value) => updateField("workspaceDigest", value)} />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Focus mode</p>
                      <p className="text-sm text-muted-foreground">Tone down interruptions during deep coding sessions.</p>
                    </div>
                    <Switch checked={form.focusModeEnabled} onCheckedChange={(value) => updateField("focusModeEnabled", value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Visibility</p>
                    <p className="text-sm text-muted-foreground">Control how visible your profile is to collaborators.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Public profile</p>
                    <p className="text-sm text-muted-foreground">Show your headline, bio, and location to teammates.</p>
                  </div>
                  <Switch checked={form.profilePublic} onCheckedChange={(value) => updateField("profilePublic", value)} />
                </div>
                <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                  Your changes are saved to the backend user record, so the same profile will be available the next time you log in.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="rounded-3xl border-border/70">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm font-semibold text-foreground">Password update</p>
                  <p className="text-sm text-muted-foreground">Leave this empty if you do not want to change your password right now.</p>
                </div>
                <label className="block space-y-2 text-sm">
                  <span className="text-muted-foreground">New password</span>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="Enter a new password"
                  />
                </label>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="min-w-36">
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
