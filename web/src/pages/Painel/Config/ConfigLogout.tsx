import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { Button } from '../../../components/ui';
import { authService } from '../../../services';

export function ConfigLogout() {
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
      variant="danger"
      fullWidth
      disabled={loading}
      onClick={handleLogout}
    >
      {loading ? 'Saindo…' : 'Sair'}
      {!loading ? <LogOut size={15} strokeWidth={1.75} /> : null}
    </Button>
  );
}
