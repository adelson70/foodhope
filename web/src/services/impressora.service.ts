import { api, request } from "./api";
import { withMutationToast } from "./mutation-toast";
import type {
  ApiResponse,
  ConfigImpressora,
  ConfigurarImpressoraInput,
  DescobrirImpressorasDados,
  EstadoPonte,
  PortaImpressora,
  TestarImpressoraDados,
} from "./types";

export const impressoraService = {
  async estadoPonte(): Promise<ApiResponse<EstadoPonte>> {
    return request(api.get<ApiResponse<EstadoPonte>>("/impressora/ponte"));
  },

  /** ip vazio = o ESP32 procura a impressora na rede dele. */
  async definirIpPonte(ip?: string): Promise<ApiResponse<EstadoPonte>> {
    return withMutationToast(
      () =>
        request(
          api.put<ApiResponse<EstadoPonte>>(
            "/impressora/ponte/ip",
            ip ? { ip } : {},
          ),
        ),
      {
        success: ip
          ? "IP enviado para o ESP32"
          : "ESP32 procurando a impressora",
        error: "Não foi possível falar com o ESP32",
      },
    );
  },

  async aceitarPonte(): Promise<ApiResponse<EstadoPonte>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<EstadoPonte>>("/impressora/ponte/aceitar"),
        ),
      {
        success: "ESP32 autorizado",
        error: "Não foi possível autorizar o ESP32",
      },
    );
  },

  async obter(): Promise<ApiResponse<ConfigImpressora>> {
    return request(api.get<ApiResponse<ConfigImpressora>>("/impressora"));
  },

  async listarPortas(): Promise<ApiResponse<{ portas: PortaImpressora[] }>> {
    return request(
      api.get<ApiResponse<{ portas: PortaImpressora[] }>>("/impressora/portas"),
    );
  },

  async descobrir(
    rede?: string,
  ): Promise<ApiResponse<DescobrirImpressorasDados>> {
    return request(
      api.get<ApiResponse<DescobrirImpressorasDados>>("/impressora/descobrir", {
        params: rede ? { rede } : undefined,
      }),
    );
  },

  async testar(
    input: ConfigurarImpressoraInput,
  ): Promise<ApiResponse<TestarImpressoraDados>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<TestarImpressoraDados>>(
            "/impressora/testar",
            input,
          ),
        ),
      {
        success: "Conexão com a impressora OK",
        error: "Não foi possível conectar à impressora",
      },
    );
  },

  async imprimirTeste(
    input: ConfigurarImpressoraInput,
  ): Promise<ApiResponse<TestarImpressoraDados>> {
    return withMutationToast(
      () =>
        request(
          api.post<ApiResponse<TestarImpressoraDados>>(
            "/impressora/imprimir-teste",
            input,
          ),
        ),
      {
        success: "Página de teste enviada para a impressora",
        error: "Não foi possível imprimir a página de teste",
      },
    );
  },

  async salvar(
    input: ConfigurarImpressoraInput,
  ): Promise<ApiResponse<ConfigImpressora>> {
    return withMutationToast(
      () =>
        request(api.put<ApiResponse<ConfigImpressora>>("/impressora", input)),
      {
        success: "Impressora configurada com sucesso",
        error: "Não foi possível salvar a impressora",
      },
    );
  },
};
