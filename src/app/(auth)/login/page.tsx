import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* soft champagne glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-muted/60 blur-3xl"
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <Logo className="[&_span]:text-xl" />
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Bienvenida</CardTitle>
            <CardDescription>
              Ingresá con tu cuenta de administración.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Depilia · gestión de clínica
        </p>
      </div>
    </div>
  );
}
