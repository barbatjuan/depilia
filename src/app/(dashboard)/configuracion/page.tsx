import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracionPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarifas</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/configuracion/tarifas"
              className="text-sm text-brand underline underline-offset-4"
            >
              Administrar tarifas
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Categorías de gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/configuracion/categorias"
              className="text-sm text-brand underline underline-offset-4"
            >
              Administrar categorías
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
