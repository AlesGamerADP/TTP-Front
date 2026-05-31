'use client';

import { useState } from 'react';
import { User, UserRole } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { UserPlus, Pencil, Trash2, Search, Building2, Shield, Mail } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useDebounce } from '../../hooks/useDebounce';
import { createUserSchema, passwordSchema } from '../../lib/validations';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead } from '../common/ResponsiveTable';
import { useIsMobile } from '../ui/use-mobile';
import { toApiUserRole } from '../../lib/roles';
import { useUsersManagementData } from '@/features/users/hooks/useUsersManagementData';
import {
  type CreateUserInput,
  createUserMutation,
  deleteUserMutation,
  sendUserCredentialsMutation,
  type UpdateUserInput,
  updateUserMutation,
} from '@/features/users/mutations';

type ApiErrorLike = {
  details?: Array<{ path?: string; message?: string }>;
  message?: string;
};

interface UserManagementProps {
  currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const toast = useToast();
  const isMobileViewport = useIsMobile();
  const canViewActivationStatus = currentUser.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSendCredentialsDialogOpen, setIsSendCredentialsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [credentialsPassword, setCredentialsPassword] = useState('');

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { users, companies, loading, reload } = useUsersManagementData({
    searchTerm: debouncedSearch,
    filterRole,
    filterCompany,
  });

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'client' as UserRole,
    company_id: '',
    access_code: '',
    password: '', // Campo opcional para contraseña
  });

  const normalizeOptionalString = (value: string): string | undefined => {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  const getApiErrorMessage = (error: unknown, fallback: string): string => {
    const apiError = (typeof error === 'object' && error !== null ? error : {}) as ApiErrorLike;
    if (Array.isArray(apiError.details) && apiError.details.length > 0) {
      return apiError.details
        .map((detail: { path?: string; message?: string }) => detail.message || detail.path || fallback)
        .join(', ');
    }
    return apiError.message || fallback;
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: 'client',
      company_id: '',
      access_code: '',
      password: '',
    });
  };

  const handleCreateUser = async () => {
    try {
      // Validaciones
      if (!formData.email || !formData.full_name) {
        toast.error('Por favor complete todos los campos obligatorios');
        return;
      }

      if ((formData.role === 'client') && !formData.company_id) {
        toast.error('Los clientes deben estar asociados a una empresa');
        return;
      }

      // Preparar datos para el backend
      const userData: CreateUserInput = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        role: toApiUserRole(formData.role),
      };

      // Solo incluir company_id si está presente y no está vacío
      if (normalizeOptionalString(formData.company_id)) {
        userData.company_id = formData.company_id.trim();
      }

      const validation = createUserSchema.safeParse(userData);
      if (!validation.success) {
        toast.error(validation.error.issues[0]?.message || 'Datos inválidos para crear usuario');
        return;
      }

      // Llamar al API para crear el usuario
      const response = await createUserMutation(userData);
      
      const generatedAccessCode = response?.data?.access_code;
      toast.success(
        `Usuario ${formData.full_name} creado exitosamente`,
        generatedAccessCode
          ? `Codigo de acceso generado automaticamente: ${generatedAccessCode}`
          : 'El codigo de acceso y la contraseña se generaron automaticamente.'
      );
      
      setIsCreateDialogOpen(false);
      resetForm();
      void reload();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Error al crear usuario');
      toast.error(errorMessage);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      // Validaciones
      if (!formData.email || !formData.full_name) {
        toast.error('Por favor complete todos los campos obligatorios');
        return;
      }

      const trimmedPassword = normalizeOptionalString(formData.password);
      if (trimmedPassword) {
        const passwordValidation = passwordSchema.safeParse(trimmedPassword);
        if (!passwordValidation.success) {
          toast.error(passwordValidation.error.issues[0]?.message || 'Contraseña inválida');
          return;
        }
      }

      // Preparar datos para el backend
      const updateData: UpdateUserInput = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
      };

      // Solo incluir role si el usuario tiene permisos para cambiarlo
      if (canEditUserRole()) {
        updateData.role = toApiUserRole(formData.role);
      }

      // Solo incluir company_id si está presente y no está vacío
      if (normalizeOptionalString(formData.company_id)) {
        updateData.company_id = formData.company_id.trim();
      }

      // Solo incluir access_code si está presente y no está vacío
      if (normalizeOptionalString(formData.access_code)) {
        updateData.access_code = formData.access_code.trim();
      }

      // Incluir contraseña solo si se proporciona una nueva
      if (trimmedPassword) {
        updateData.password = trimmedPassword;
      }

      // Llamar al API para actualizar el usuario
      await updateUserMutation(selectedUser.id, updateData);

      toast.success('Usuario actualizado exitosamente');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      void reload();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Error al actualizar usuario');
      toast.error(errorMessage);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      toast.error('Error: Usuario no seleccionado');
      return;
    }

    try {
      // Verificar permisos
      if (!canManageUser(selectedUser)) {
        toast.error('No tienes permisos para eliminar este usuario');
        return;
      }

      // Llamar al API para eliminar (soft-delete: is_active=false)
      await deleteUserMutation(selectedUser.id);

      toast.success(`Usuario ${selectedUser.full_name} eliminado exitosamente`, 'Los componentes de la empresa se mantienen intactos.');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      void reload();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
      toast.error(errorMessage);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role,
      company_id: user.company_id || '',
      access_code: user.access_code || '',
      password: '', // No se muestra la contraseña actual
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openSendCredentialsDialog = (user: User) => {
    setSelectedUser(user);
    setCredentialsPassword('');
    setIsSendCredentialsDialogOpen(true);
  };

  const handleSendCredentials = async () => {
    if (!selectedUser) {
      toast.error('Error: Usuario no seleccionado');
      return;
    }

    try {
      setSendingCredentials(true);
      // Enviar contraseña solo si se proporciona una, sino enviar string vacío para usar la almacenada
      const passwordToSend = credentialsPassword.trim() || '';

      if (passwordToSend) {
        const passwordValidation = passwordSchema.safeParse(passwordToSend);
        if (!passwordValidation.success) {
          toast.error(passwordValidation.error.issues[0]?.message || 'Contraseña inválida');
          setSendingCredentials(false);
          return;
        }
      }

      await sendUserCredentialsMutation(selectedUser.id, passwordToSend);
      
      toast.success(`Credenciales enviadas exitosamente a ${selectedUser.email}`);
      setIsSendCredentialsDialogOpen(false);
      setCredentialsPassword('');
      setSelectedUser(null);
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Error al enviar credenciales');
      toast.error(errorMessage);
    } finally {
      setSendingCredentials(false);
    }
  };

  const getRoleBadge = (role: UserRole | string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      user_manager: 'Gestor de Usuarios',
      client: 'Cliente',
      interno: 'Interno',
    };

    const label = labels[role] || role;
    return <Badge variant="outline">{label}</Badge>;
  };

  const canManageUser = (user: User): boolean => {
    // Admin puede gestionar todos
    if (currentUser.role === 'admin') return true;
    
    // User manager puede gestionar SOLO clientes e internos, NO admins ni otros managers
    if (currentUser.role === 'user_manager') {
      return user.role === 'client' || user.role === 'interno';
    }
    
    return false;
  };

  const canEditUserRole = (): boolean => {
    // User manager NO puede cambiar el rol de usuarios (solo admin puede)
    if (currentUser.role === 'user_manager') {
      return false;
    }
    return currentUser.role === 'admin';
  };

  const renderUserMobileCard = (user: User) => {
    const companyName = user.company?.name || 'Sin empresa asignada';
    const accessCode = user.access_code || 'Sin código';

    return (
      <Card key={user.id} className="border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium leading-tight break-words">{user.full_name}</p>
              <p className="text-sm text-muted-foreground break-all">{user.email}</p>
            </div>
            {canViewActivationStatus && (
              <Badge variant={user.is_active ? 'default' : 'secondary'} className="whitespace-nowrap">
                {user.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {getRoleBadge(user.role)}
            <Badge variant="outline" className="max-w-full break-all whitespace-normal">
              {accessCode}
            </Badge>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{companyName}</span>
          </div>

          {canManageUser(user) && (
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(user)}
                aria-label={`Editar usuario ${user.full_name}`}
                className="mobile-action-button mobile-action-button--edit justify-center"
              >
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSendCredentialsDialog(user)}
                aria-label={`Enviar credenciales a ${user.full_name}`}
                className="mobile-action-button mobile-action-button--send justify-center"
              >
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                Enviar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDeleteDialog(user)}
                aria-label={`Eliminar usuario ${user.full_name}`}
                className="mobile-action-button mobile-action-button--delete justify-center"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Eliminar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const emphasizedFieldClassName = 'border-transparent shadow-sm';
  const emphasizedFieldStyle = { borderColor: 'rgba(15, 23, 42, 0.14)' } as const;

  const renderCreateUserFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre Completo *</Label>
        <Input
          id="full_name"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Juan Pérez"
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="usuario@ejemplo.com"
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Tipo de Usuario *</Label>
        <Select
          value={formData.role}
          onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
        >
          <SelectTrigger className={emphasizedFieldClassName} style={emphasizedFieldStyle}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currentUser.role === 'admin' && (
              <>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="user_manager">Gestor de Usuarios</SelectItem>
              </>
            )}
            {currentUser.role === 'user_manager' && (
              <>
                <SelectItem value="interno">Acceso Interno</SelectItem>
                <SelectItem value="client">Acceso Cliente</SelectItem>
              </>
            )}
            {currentUser.role !== 'user_manager' && (
              <>
                <SelectItem value="interno">Acceso Interno</SelectItem>
                <SelectItem value="client">Acceso Cliente</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {formData.role === 'client' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="company">Empresa *</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
            >
              <SelectTrigger className={emphasizedFieldClassName} style={emphasizedFieldStyle}>
                <SelectValue placeholder="Seleccione empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );

  const renderEditUserFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit_full_name">Nombre Completo *</Label>
        <Input
          id="edit_full_name"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_email">Email *</Label>
        <Input
          id="edit_email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_password">Nueva Contraseña (opcional)</Label>
        <Input
          id="edit_password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Dejar vacío para mantener actual"
          minLength={8}
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
        <p className="text-xs text-muted-foreground">
          Si la cambias, debe tener al menos 8 caracteres, una letra y un número.
        </p>
      </div>

      {selectedUser && canEditUserRole() && (
        <div className="space-y-2">
          <Label htmlFor="edit_role">Tipo de Usuario</Label>
          <Select
            value={formData.role}
            onValueChange={(value: UserRole) => {
              setFormData({ ...formData, role: value, company_id: '', access_code: '' });
            }}
          >
            <SelectTrigger className={emphasizedFieldClassName} style={emphasizedFieldStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentUser.role === 'admin' && (
                <>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user_manager">Gestor de Usuarios</SelectItem>
                </>
              )}
              <SelectItem value="interno">Acceso Interno</SelectItem>
              <SelectItem value="client">Acceso Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.role === 'client' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="edit_company">Empresa</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
            >
              <SelectTrigger className={emphasizedFieldClassName} style={emphasizedFieldStyle}>
                <SelectValue placeholder="Seleccione empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_access_code">Código de Acceso</Label>
            <Input
              id="edit_access_code"
              value={formData.access_code}
              onChange={(e) => setFormData({ ...formData, access_code: e.target.value })}
              placeholder="Ej: EJ001"
              className={emphasizedFieldClassName}
              style={emphasizedFieldStyle}
            />
          </div>
        </>
      )}
    </div>
  );

  const renderSendCredentialsFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="credentials_password">Contraseña a Enviar (Opcional)</Label>
        <Input
          id="credentials_password"
          type="password"
          value={credentialsPassword}
          onChange={(e) => setCredentialsPassword(e.target.value)}
          placeholder="Dejar vacío para usar la contraseña original del usuario"
          disabled={sendingCredentials}
          minLength={8}
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
        <p className="text-sm text-muted-foreground">
          Si lo dejas vacío, se enviará la contraseña actual. Si escribes una nueva, debe tener al menos 8 caracteres, una letra y un número.
        </p>
      </div>
    </div>
  );

  const mobileDialogContentClassName =
    'max-w-[calc(100vw-1rem)] p-4 pt-6 max-h-[85vh] overflow-y-auto';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="management-card-header">
          <CardTitle className="flex items-center gap-2 text-lg leading-tight sm:text-xl">
            <Shield className="h-6 w-6" />
            Gestión de Usuarios
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed sm:text-base">
            Crear y administrar usuarios con acceso al sistema
          </CardDescription>
          {isMobileViewport ? (
            <>
              <div className="pt-4">
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="management-create-button w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className={mobileDialogContentClassName}>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Complete los datos del nuevo usuario del sistema
                    </DialogDescription>
                  </DialogHeader>
                  {renderCreateUserFields()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateUser} className="management-primary-button">Crear Usuario</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <>
              <CardAction className="management-card-action">
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="management-create-button shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </CardAction>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Complete los datos del nuevo usuario del sistema
                    </DialogDescription>
                  </DialogHeader>
                  {renderCreateUserFields()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateUser} className="management-primary-button">Crear Usuario</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterRole} onValueChange={(value: UserRole | 'all') => setFilterRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="user_manager">Gestores</SelectItem>
                <SelectItem value="interno">Internos</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div
              className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 px-4 text-center text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios con los filtros aplicados
            </div>
          ) : isMobileViewport ? (
            <div className="space-y-3">
              {users.map((user) => renderUserMobileCard(user))}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <ResponsiveTable aria-label="Tabla de usuarios">
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead className="px-3 py-3 text-left">Nombre</ResponsiveTableHead>
                  <ResponsiveTableHead className="px-3 py-3 text-left">Email</ResponsiveTableHead>
                  <ResponsiveTableHead className="px-3 py-3 text-left">Rol</ResponsiveTableHead>
                  <ResponsiveTableHead className="px-3 py-3 text-left">Empresa</ResponsiveTableHead>
                  <ResponsiveTableHead className="px-3 py-3 text-left">Código</ResponsiveTableHead>
                  {canViewActivationStatus && (
                    <ResponsiveTableHead className="px-3 py-3 text-left">Estado</ResponsiveTableHead>
                  )}
                  <ResponsiveTableHead className="px-3 py-3 text-right">Acciones</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {users.map((user) => (
                  <ResponsiveTableRow key={user.id}>
                    <ResponsiveTableCell className="px-3 py-3">{user.full_name}</ResponsiveTableCell>
                    <ResponsiveTableCell className="px-3 py-3">{user.email}</ResponsiveTableCell>
                    <ResponsiveTableCell className="px-3 py-3">
                      {getRoleBadge(user.role)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="px-3 py-3">
                      {user.company ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{user.company.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="px-3 py-3">
                      {user.access_code ? (
                        <Badge variant="outline" className="whitespace-nowrap">{user.access_code}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </ResponsiveTableCell>
                    {canViewActivationStatus && (
                      <ResponsiveTableCell className="px-3 py-3">
                        <Badge variant={user.is_active ? 'default' : 'secondary'} className="whitespace-nowrap">
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </ResponsiveTableCell>
                    )}
                    <ResponsiveTableCell className="px-3 py-3 text-right">
                      {canManageUser(user) && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            aria-label={`Editar usuario ${user.full_name}`}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSendCredentialsDialog(user)}
                            aria-label={`Enviar credenciales a ${user.full_name}`}
                            title="Enviar credenciales por correo"
                            className="h-8 w-8 p-0"
                          >
                            <Mail className="h-4 w-4 text-blue-500" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            aria-label={`Eliminar usuario ${user.full_name}`}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {isMobileViewport ? (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className={mobileDialogContentClassName}>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Actualizar información del usuario
              </DialogDescription>
            </DialogHeader>
            {renderEditUserFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditUser} className="management-primary-button">Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Actualizar información del usuario
              </DialogDescription>
            </DialogHeader>
            {renderEditUserFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditUser} className="management-primary-button">Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        title="¿Eliminar usuario?"
        description={`Esta acción eliminará el usuario ${selectedUser?.full_name || ''} del sistema. Los componentes hidráulicos asociados a la empresa ${selectedUser?.company?.name ? `"${selectedUser.company.name}"` : ''} se mantendrán intactos y podrán ser accedidos por otros usuarios de la misma empresa.`}
        confirmText="Eliminar Usuario"
        cancelText="Cancelar"
        variant="destructive"
      />

      {/* Send Credentials Dialog */}
      {isMobileViewport ? (
        <Dialog open={isSendCredentialsDialogOpen} onOpenChange={setIsSendCredentialsDialogOpen}>
          <DialogContent className={mobileDialogContentClassName}>
            <DialogHeader>
              <DialogTitle>Enviar Credenciales por Correo</DialogTitle>
              <DialogDescription>
                Se enviará la contraseña del usuario a {selectedUser?.full_name} ({selectedUser?.email})
              </DialogDescription>
            </DialogHeader>
            {renderSendCredentialsFields()}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSendCredentialsDialogOpen(false);
                  setCredentialsPassword('');
                }}
                disabled={sendingCredentials}
              >
                Cancelar
              </Button>
              <Button onClick={handleSendCredentials} disabled={sendingCredentials}>
                {sendingCredentials ? 'Enviando...' : 'Enviar Credenciales'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={isSendCredentialsDialogOpen} onOpenChange={setIsSendCredentialsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Credenciales por Correo</DialogTitle>
              <DialogDescription>
                Se enviará la contraseña del usuario a {selectedUser?.full_name} ({selectedUser?.email})
              </DialogDescription>
            </DialogHeader>
            {renderSendCredentialsFields()}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsSendCredentialsDialogOpen(false);
                  setCredentialsPassword('');
                }}
                disabled={sendingCredentials}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSendCredentials}
                disabled={sendingCredentials}
              >
                {sendingCredentials ? 'Enviando...' : 'Enviar Credenciales'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
