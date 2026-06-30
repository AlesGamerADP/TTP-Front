import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { login, type User } from '../../lib/auth';
import { logger } from '../../lib/logger';
import { Lock, Loader2, RefreshCw, User as UserIcon, KeyRound, Eye, EyeOff } from 'lucide-react';
import TestCredentials from './TestCredentials';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '../ui/utils';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFieldHover, setPasswordFieldHover] = useState(false);
  const [passwordFieldFocus, setPasswordFieldFocus] = useState(false);

  const showPasswordToggle = passwordFieldHover || passwordFieldFocus;

  const [showTestCredentials, setShowTestCredentials] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    // Mostrar credenciales de prueba en localhost, desarrollo o mediante parámetro ?test=1
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasTestParam = window.location.search.includes('test=1') || window.location.search.includes('demo=1');
      setShowTestCredentials(process.env.NODE_ENV === 'development' || isLocal || hasTestParam);
    }
    
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const performLogin = async () => {
    setError('');
    setIsNetworkError(false);
    setIsPressed(false);
    setIsLoading(true);

    try {
      const user = await login(codigo, password);
      if (user) {
        logger.info('Login form submission successful', { codigo });
        onLogin(user);
      } else {
        logger.warn('Login form submission failed - user not found', { codigo });
        setError('Credenciales inválidas. Verifica tu código de usuario y contraseña.');
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Error desconocido';
      const errorDetails = err instanceof Error ? {
        message: err.message,
        name: err.name,
        stack: err.stack
      } : err;

      logger.error('Login form submission error', {
        error: errorMessage,
        errorDetails,
        codigo,
        errorType: typeof err,
        isError: err instanceof Error
      });

      let userFriendlyMessage = 'Error al iniciar sesión.';
      let isNetwork = false;

      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('401') || errorMessage.includes('Credenciales inválidas') || errorMessage.includes('INVALID_CREDENTIALS')) {
        userFriendlyMessage = 'Credenciales inválidas. Verifica que estés usando el código de acceso correcto (access_code o email) y la contraseña correcta. Si el usuario fue creado sin contraseña, usa la función "Enviar Credenciales" para recibirla por email.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('No se pudo conectar')) {
        userFriendlyMessage = 'No se pudo conectar al servidor. Verifica que el backend esté corriendo.';
        isNetwork = true;
      } else if (errorMessage.includes('NetworkError') || errorMessage.includes('network')) {
        userFriendlyMessage = 'Error de conexión. Verifica tu conexión a internet y que el servidor esté disponible.';
        isNetwork = true;
      } else {
        userFriendlyMessage = errorMessage || 'Error al iniciar sesión. Por favor, intenta nuevamente.';
      }

      setError(userFriendlyMessage);
      setIsNetworkError(isNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin();
  };

  return (
    <div className="login-shell relative h-screen w-screen overflow-y-auto select-none hide-scrollbar">
      <div className="absolute right-3 top-3 sm:right-4 sm:top-4 z-50">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center justify-center min-h-full w-full px-3 py-6 sm:py-10 md:py-12">
        <div className="w-full max-w-full sm:max-w-md space-y-4 sm:space-y-6 md:space-y-8 flex flex-col justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4 sm:mb-6 md:mb-8">
            <Image
              src="/logo.png"
              alt="INGETEC HYDRAULIC SYSTEMS"
              width={400}
              height={133}
              className="h-auto w-[300px] sm:w-[360px] md:w-[450px]"
              priority
            />
          </div>
          <h1 className="brand-accent-text text-xl sm:text-2xl md:text-3xl font-semibold mb-1 sm:mb-2">Portal de Mantenimiento Hidráulico</h1>
          <p className="brand-muted-text text-sm sm:text-base">
            Ingresa con tu código de usuario para acceder al sistema
          </p>
        </div>

        <Card className="w-full max-w-md mx-auto shadow-lg border">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
            <CardTitle className="brand-accent-text flex w-full items-center justify-center gap-2 text-lg sm:text-xl">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              Acceso al sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo" className="brand-accent-text text-base">
                  <UserIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  Código
                </Label>
                <Input
                  id="codigo"
                  type="text"
                  placeholder="Ingresa su usuario"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  autoComplete="username"
                  className="login-form-control text-base md:text-base w-full px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="brand-accent-text text-base">
                  <KeyRound className="w-5 h-5 shrink-0" aria-hidden="true" />
                  Contraseña
                </Label>
                <div
                  className="login-form-control login-password-field"
                  onMouseEnter={() => setPasswordFieldHover(true)}
                  onMouseLeave={() => setPasswordFieldHover(false)}
                >
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFieldFocus(true)}
                    onBlur={() => {
                      setPasswordFieldFocus(false);
                      setShowPassword(false);
                    }}
                    required
                    autoComplete="current-password"
                    className="login-form-control text-base md:text-base min-w-0 flex-1 px-3 shadow-none"
                  />
                  <button
                    type="button"
                    tabIndex={showPasswordToggle ? 0 : -1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="brand-muted-text flex h-full shrink-0 items-center justify-center overflow-hidden transition-all duration-200 hover:text-[var(--brand-primary)]"
                    style={{
                      opacity: showPasswordToggle ? 1 : 0,
                      width: showPasswordToggle ? '2.5rem' : 0,
                      paddingLeft: showPasswordToggle ? 0 : 0,
                      paddingRight: showPasswordToggle ? 0 : 0,
                      pointerEvents: showPasswordToggle ? 'auto' : 'none',
                    }}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-hidden={!showPasswordToggle}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive" className="text-xs sm:text-sm flex flex-col gap-2 items-start">
                  <AlertDescription>{error}</AlertDescription>
                  {isNetworkError && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button" 
                      onClick={performLogin} 
                      disabled={isLoading}
                      className="mt-1 h-8 bg-transparent text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <RefreshCw className="mr-2 h-3 w-3" aria-hidden="true" />
                      )}
                      Reintentar conexión
                    </Button>
                  )}
                </Alert>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                onPointerDown={() => {
                  if (!isLoading) setIsPressed(true);
                }}
                onPointerUp={() => setIsPressed(false)}
                onPointerLeave={() => setIsPressed(false)}
                onPointerCancel={() => setIsPressed(false)}
                className={cn(
                  'login-submit-button w-full font-semibold h-11 sm:h-12 text-base sm:text-lg !text-white border-0 shadow-md',
                  'transition-[transform,box-shadow,background-color] duration-100 ease-out',
                  'hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/50 focus-visible:ring-offset-2',
                  'disabled:opacity-100',
                  isLoading && 'login-submit-button--loading cursor-wait',
                  isPressed && !isLoading && 'login-submit-button--pressed scale-[0.96] shadow-inner ring-4 ring-[var(--brand-primary)]/30',
                )}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {showTestCredentials && (
          <div className="w-full max-w-md mx-auto">
            <TestCredentials />
          </div>
        )}
      </div>
    </div>
  </div>
  );
}