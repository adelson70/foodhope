import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { Button } from '../ui';
import { authService } from '../../services';

export function PainelLogoutButton() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await authService.logout();
    } catch {
    } finally {
      setLoading(false);
      navigate('/', { replace: true });
    }
  }

  return (
    <Button
      type="button"
      variant="dangerGhost"
      aria-label="Sair"
      disabled={loading}
      onClick={handleLogout}
    >
      <LogOut size={18} strokeWidth={1.75} />
    </Button>
  );
}
