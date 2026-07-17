import { Link } from 'react-router-dom';

import { LegalDocLayout, LegalSection } from '../LegalDocLayout';

export function Privacidade() {
  return (
    <LegalDocLayout
      title="Política de Privacidade"
      relatedTo="/termos"
      relatedLabel="Termos de Uso"
    >
      <p className="text-caption text-on-surface-variant">
        Vigência: 17 de julho de 2026
      </p>

      <LegalSection title="1. Quem somos">
        <p>
          O Food Hope é o aplicativo de cardápio digital e pedidos utilizado pelo
          estabelecimento. Esta Política descreve como tratamos dados pessoais
          quando você consulta o cardápio ou envia um pedido.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <p>Podemos tratar as seguintes informações:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="text-on-surface">Dados do pedido:</span> primeiro
            nome, sobrenome e telefone de contato; itens escolhidos,
            quantidades e observação opcional que você informar.
          </li>
          <li>
            <span className="text-on-surface">Sessão de visitante:</span>{' '}
            identificador criptográfico do seu dispositivo (chaves geradas no
            aparelho), sem nome ou telefone nessa etapa.
          </li>
          <li>
            <span className="text-on-surface">No seu dispositivo:</span> perfil
            (nome e telefone) e histórico local de pedidos salvos no navegador
            (IndexedDB), para facilitar novos pedidos e consulta no aparelho.
          </li>
          <li>
            <span className="text-on-surface">Operadores do painel:</span> nome
            e senha (armazenada de forma criptografada/hash), apenas para acesso
            interno à área operacional.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades">
        <p>Utilizamos os dados para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>identificar e registrar o pedido no estabelecimento;</li>
          <li>permitir contato operacional quando necessário;</li>
          <li>
            imprimir o ticket da cozinha com o nome do cliente (sem o telefone);
          </li>
          <li>manter histórico local de pedidos no seu aparelho;</li>
          <li>
            autenticar a sessão de visitante e, no painel, a sessão do operador.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base legal">
        <p>
          O tratamento ocorre principalmente para a execução do pedido que você
          solicita e para o legítimo interesse operacional do estabelecimento. Ao
          finalizar o pedido, você declara estar ciente desta Política e dos{' '}
          <Link
            to="/termos"
            className="text-primary underline-offset-2 hover:underline"
          >
            Termos de Uso
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Compartilhamento">
        <p>
          Não vendemos seus dados pessoais. Não utilizamos ferramentas de
          analytics ou marketing de terceiros no aplicativo. Os dados são
          processados na infraestrutura do estabelecimento (banco de dados,
          serviços de apoio e impressão local do pedido).
        </p>
      </LegalSection>

      <LegalSection title="6. Armazenamento e retenção">
        <p>
          Os pedidos e cadastros de contato ficam no servidor do estabelecimento.
          Perfil e histórico local permanecem no seu navegador até você limpar
          os dados do site ou do aplicativo. Mantemos as informações pelo tempo
          necessário à operação e às obrigações legais aplicáveis.
        </p>
      </LegalSection>

      <LegalSection title="7. Direitos do titular">
        <p>
          Nos termos da LGPD, você pode solicitar acesso, correção, exclusão,
          portabilidade e informações sobre o tratamento dos seus dados.
          Encaminhe o pedido diretamente ao estabelecimento que utiliza o Food
          Hope.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies e armazenamento local">
        <p>
          O painel do operador usa um cookie de sessão. No uso como cliente,
          guardamos sessão de visitante, carrinho, perfil e pedidos locais no
          IndexedDB do navegador. Não usamos cookies de rastreamento ou
          publicidade.
        </p>
      </LegalSection>

      <LegalSection title="9. Atualizações">
        <p>
          Esta Política pode ser atualizada para refletir mudanças no Food Hope
          ou na legislação. A data de vigência aparece no topo desta página.
        </p>
      </LegalSection>
    </LegalDocLayout>
  );
}
