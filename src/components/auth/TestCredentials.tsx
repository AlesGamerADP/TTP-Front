import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Shield, Users, Wrench, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { toast } from 'sonner';

interface Credential {
  role: string;
  roleLabel: string;
  icon: React.ReactElement;
  codigo: string;
  password: string;
  description: string;
}

export default function TestCredentials() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const credentials: Credential[] = [
    {
      role: 'admin',
      roleLabel: 'Administrador',
      icon: <Shield className="w-5 h-5" aria-hidden="true" />,
      codigo: 'ADMIN',
      password: 'admin123',
      description: 'Acceso total: gestión de usuarios, empresas y componentes',
    },
    {
      role: 'user_manager',
      roleLabel: 'Gestor de Usuarios',
      icon: <Users className="w-5 h-5" aria-hidden="true" />,
      codigo: 'MANAGER',
      password: 'manager123',
      description: 'Puede crear usuarios cliente e interno, ver componentes',
    },
    {
      role: 'interno',
      roleLabel: 'Acceso Interno',
      icon: <Wrench className="w-5 h-5" aria-hidden="true" />,
      codigo: 'INTERNO001',
      password: 'interno123',
      description: 'Gestión de componentes: crear, modificar, actualizar estados',
    },
  ];

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Error al copiar');
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4 sm:mt-6 w-full">
      <Card className="w-full max-w-md mx-auto shadow-lg border overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4 px-6 pt-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <CardTitle className="text-lg font-semibold leading-none">Usuarios de Prueba</CardTitle>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </div>
            {isOpen && (
              <CardDescription className="text-sm text-muted-foreground mt-2">
                Clic para ver los códigos de usuario disponibles
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-6 px-6">
            <div className="space-y-3">
              {credentials.map((cred) => (
                <div
                  key={cred.codigo}
                  className="border rounded-lg p-4 space-y-3 transition-all hover:shadow-md bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground flex-shrink-0">
                      {React.cloneElement(cred.icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">{cred.roleLabel}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{cred.description}</p>

                  <div className="flex items-center gap-2">
                    <div className="test-credentials-code flex-1 min-w-0 px-3 py-2 rounded text-sm font-mono border">
                      <span className="brand-muted-text">Código: </span>
                      <span className="brand-accent-text font-semibold">{cred.codigo}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(cred.codigo, `${cred.codigo}-code`)}
                      className="h-8 w-8 p-0 flex-shrink-0"
                      aria-label={`Copiar código ${cred.codigo}`}
                    >
                      {copiedField === `${cred.codigo}-code` ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="test-credentials-warning mt-6 p-4 rounded-lg border">
              <p className="brand-accent-text text-sm leading-relaxed">
                <strong>Nota:</strong> En modo desarrollo, cualquier contraseña funciona. Solo necesitas el código de usuario correcto.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
