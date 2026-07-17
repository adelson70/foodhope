import { Link } from 'react-router-dom';

import { LegalDocLayout, LegalSection } from '../LegalDocLayout';

export function Termos() {
  return (
    <LegalDocLayout
      title="Termos de Uso"
      relatedTo="/privacidade"
      relatedLabel="Política de Privacidade"
    >
      <p className="text-caption text-on-surface-variant">
        Vigência: 17 de julho de 2026
      </p>

      <LegalSection title="1. Objeto">
        <p>
          Estes Termos regem o uso do Food Hope, aplicativo de cardápio digital
          que permite consultar produtos e enviar pedidos ao estabelecimento.
        </p>
      </LegalSection>

      <LegalSection title="2. Aceite">
        <p>
          Ao finalizar um pedido no aplicativo, você concorda com estes Termos
          de Uso e com a{' '}
          <Link
            to="/privacidade"
            className="text-primary underline-offset-2 hover:underline"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Identificação">
        <p>
          Para enviar um pedido, você informa nome, sobrenome e telefone de
          contato. Uma sessão de visitante é criada automaticamente no
          dispositivo para permitir o uso do cardápio e do carrinho. Você se
          compromete a fornecer dados verdadeiros e atualizados.
        </p>
      </LegalSection>

      <LegalSection title="4. Pedidos">
        <p>
          O pedido é enviado ao estabelecimento e, quando aceito pelo sistema,
          você recebe a confirmação com o número do pedido. O Food Hope não
          exibe status de preparo, previsão de entrega nem acompanhamento em
          tempo real. Dúvidas sobre o andamento devem ser tratadas diretamente
          com o estabelecimento.
        </p>
      </LegalSection>

      <LegalSection title="5. Preços e cardápio">
        <p>
          Preços, disponibilidade e composição dos itens são os exibidos no
          aplicativo no momento do pedido. O estabelecimento pode alterar o
          cardápio a qualquer momento. Itens indisponíveis podem ser rejeitados
          no envio.
        </p>
      </LegalSection>

      <LegalSection title="6. Obrigações do usuário">
        <p>
          Você se compromete a utilizar o aplicativo de forma adequada, sem
          tentar comprometer a segurança, sobrecarregar o serviço ou enviar
          pedidos abusivos ou fraudulentos.
        </p>
      </LegalSection>

      <LegalSection title="7. Responsabilidades">
        <p>
          O Food Hope intermedia o envio do pedido ao estabelecimento. A
          preparação, a qualidade dos produtos e qualquer entrega ou retirada
          são de responsabilidade do estabelecimento. Na medida permitida pela
          lei, o aplicativo não se responsabiliza por indisponibilidades
          temporárias de rede, dispositivo ou infraestrutura.
        </p>
      </LegalSection>

      <LegalSection title="8. Dados pessoais">
        <p>
          O tratamento de dados pessoais segue a{' '}
          <Link
            to="/privacidade"
            className="text-primary underline-offset-2 hover:underline"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações e foro">
        <p>
          Estes Termos podem ser atualizados periodicamente. A data de vigência
          aparece no topo desta página. A relação é regida pelas leis da
          República Federativa do Brasil, ficando eleito o foro do domicílio do
          estabelecimento, salvo disposição legal em contrário.
        </p>
      </LegalSection>
    </LegalDocLayout>
  );
}
