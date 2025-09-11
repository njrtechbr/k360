import {
  RhApiClient,
  CreateFuncaoData,
  CreateSetorData,
  UpdateFuncaoData,
  UpdateSetorData,
  BulkCreateFuncaoData,
  BulkCreateSetorData,
} from "../rhApiClient";
import { httpClient } from "@/lib/httpClient";
import { Funcao, Setor } from "@prisma/client";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("RhApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Funções", () => {
    describe("findAllFuncoes", () => {
      it("deve buscar todas as funções sem detalhes", async () => {
        const mockFuncoes: Funcao[] = [
          { name: "Atendente" },
          { name: "Supervisor" },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockFuncoes },
        });

        const result = await RhApiClient.findAllFuncoes();

        expect(mockHttpClient.get).toHaveBeenCalledWith("/api/funcoes?");
        expect(result).toEqual(mockFuncoes);
      });

      it("deve buscar todas as funções com detalhes", async () => {
        const mockFuncoesWithDetails = [
          { name: "Atendente", attendantCount: 10 },
          { name: "Supervisor", attendantCount: 2 },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockFuncoesWithDetails },
        });

        const result = await RhApiClient.findAllFuncoes(true);

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/funcoes?includeDetails=true",
        );
        expect(result).toEqual(mockFuncoesWithDetails);
      });

      it("deve tratar erro ao buscar funções", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        await expect(RhApiClient.findAllFuncoes()).rejects.toThrow(
          "Falha ao buscar funções",
        );
      });
    });

    describe("searchFuncoes", () => {
      it("deve pesquisar funções com filtro", async () => {
        const mockFuncoes: Funcao[] = [{ name: "Atendente" }];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockFuncoes },
        });

        const result = await RhApiClient.searchFuncoes("Atend");

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/funcoes?search=Atend",
        );
        expect(result).toEqual(mockFuncoes);
      });

      it("deve pesquisar funções com filtro e detalhes", async () => {
        const mockFuncoesWithDetails = [
          { name: "Atendente", attendantCount: 10 },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockFuncoesWithDetails },
        });

        const result = await RhApiClient.searchFuncoes("Atend", true);

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/funcoes?search=Atend&includeDetails=true",
        );
        expect(result).toEqual(mockFuncoesWithDetails);
      });
    });

    describe("createFuncao", () => {
      it("deve criar função com sucesso", async () => {
        const funcaoData: CreateFuncaoData = {
          name: "Nova Função",
        };

        const mockCreatedFuncao: Funcao = {
          name: "Nova Função",
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: { data: mockCreatedFuncao },
        });

        const result = await RhApiClient.createFuncao(funcaoData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/funcoes",
          funcaoData,
        );
        expect(result).toEqual(mockCreatedFuncao);
      });

      it("deve validar dados obrigatórios", async () => {
        const invalidData = {
          name: "", // Nome vazio
        } as CreateFuncaoData;

        await expect(RhApiClient.createFuncao(invalidData)).rejects.toThrow(
          "Dados inválidos",
        );

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("createFuncoesBulk", () => {
      it("deve criar múltiplas funções em lote", async () => {
        const bulkData: BulkCreateFuncaoData = {
          names: ["Função 1", "Função 2", "Função 3"],
        };

        const mockResult = {
          created: 3,
          names: ["Função 1", "Função 2", "Função 3"],
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: { data: mockResult },
        });

        const result = await RhApiClient.createFuncoesBulk(bulkData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/funcoes",
          bulkData,
        );
        expect(result).toEqual(mockResult);
      });

      it("deve validar limite de funções em lote", async () => {
        const invalidData = {
          names: new Array(51).fill("Função"), // Mais de 50 funções
        } as BulkCreateFuncaoData;

        await expect(
          RhApiClient.createFuncoesBulk(invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it("deve validar array vazio", async () => {
        const invalidData = {
          names: [], // Array vazio
        } as BulkCreateFuncaoData;

        await expect(
          RhApiClient.createFuncoesBulk(invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("updateFuncao", () => {
      it("deve atualizar função com sucesso", async () => {
        const updateData: UpdateFuncaoData = {
          oldName: "Função Antiga",
          newName: "Função Nova",
        };

        const mockUpdatedFuncao: Funcao = {
          name: "Função Nova",
        };

        mockHttpClient.put.mockResolvedValue({
          success: true,
          data: { data: mockUpdatedFuncao },
        });

        const result = await RhApiClient.updateFuncao(updateData);

        expect(mockHttpClient.put).toHaveBeenCalledWith(
          "/api/funcoes",
          updateData,
        );
        expect(result).toEqual(mockUpdatedFuncao);
      });

      it("deve validar dados de atualização", async () => {
        const invalidData = {
          oldName: "", // Nome antigo vazio
          newName: "Função Nova",
        } as UpdateFuncaoData;

        await expect(RhApiClient.updateFuncao(invalidData)).rejects.toThrow(
          "Dados inválidos",
        );

        expect(mockHttpClient.put).not.toHaveBeenCalled();
      });
    });

    describe("deleteFuncao", () => {
      it("deve deletar função com sucesso", async () => {
        mockHttpClient.delete.mockResolvedValue({
          success: true,
          data: {},
        });

        await RhApiClient.deleteFuncao("Função Teste");

        expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/funcoes", {
          name: "Função Teste",
        });
      });
    });

    describe("deleteFuncoesBulk", () => {
      it("deve deletar múltiplas funções em lote", async () => {
        const names = ["Função 1", "Função 2"];
        const mockResult = {
          deleted: 2,
          names: ["Função 1", "Função 2"],
        };

        mockHttpClient.delete.mockResolvedValue({
          success: true,
          data: { data: mockResult },
        });

        const result = await RhApiClient.deleteFuncoesBulk(names);

        expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/funcoes", {
          names,
        });
        expect(result).toEqual(mockResult);
      });
    });

    describe("funcaoExists", () => {
      it("deve verificar se função existe", async () => {
        const mockFuncoes: Funcao[] = [
          { name: "Atendente" },
          { name: "Supervisor" },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockFuncoes },
        });

        const exists = await RhApiClient.funcaoExists("Atendente");
        const notExists = await RhApiClient.funcaoExists("Inexistente");

        expect(exists).toBe(true);
        expect(notExists).toBe(false);
      });

      it("deve retornar false em caso de erro", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        const result = await RhApiClient.funcaoExists("Atendente");

        expect(result).toBe(false);
      });
    });
  });

  describe("Setores", () => {
    describe("findAllSetores", () => {
      it("deve buscar todos os setores sem detalhes", async () => {
        const mockSetores: Setor[] = [{ name: "Vendas" }, { name: "Suporte" }];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockSetores },
        });

        const result = await RhApiClient.findAllSetores();

        expect(mockHttpClient.get).toHaveBeenCalledWith("/api/setores?");
        expect(result).toEqual(mockSetores);
      });

      it("deve buscar todos os setores com detalhes", async () => {
        const mockSetoresWithDetails = [
          { name: "Vendas", attendantCount: 15 },
          { name: "Suporte", attendantCount: 8 },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockSetoresWithDetails },
        });

        const result = await RhApiClient.findAllSetores(true);

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/setores?includeDetails=true",
        );
        expect(result).toEqual(mockSetoresWithDetails);
      });

      it("deve tratar erro ao buscar setores", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        await expect(RhApiClient.findAllSetores()).rejects.toThrow(
          "Falha ao buscar setores",
        );
      });
    });

    describe("searchSetores", () => {
      it("deve pesquisar setores com filtro", async () => {
        const mockSetores: Setor[] = [{ name: "Vendas" }];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockSetores },
        });

        const result = await RhApiClient.searchSetores("Vend");

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/setores?search=Vend",
        );
        expect(result).toEqual(mockSetores);
      });
    });

    describe("createSetor", () => {
      it("deve criar setor com sucesso", async () => {
        const setorData: CreateSetorData = {
          name: "Novo Setor",
        };

        const mockCreatedSetor: Setor = {
          name: "Novo Setor",
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: { data: mockCreatedSetor },
        });

        const result = await RhApiClient.createSetor(setorData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/setores",
          setorData,
        );
        expect(result).toEqual(mockCreatedSetor);
      });

      it("deve validar dados obrigatórios", async () => {
        const invalidData = {
          name: "", // Nome vazio
        } as CreateSetorData;

        await expect(RhApiClient.createSetor(invalidData)).rejects.toThrow(
          "Dados inválidos",
        );

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("createSetoresBulk", () => {
      it("deve criar múltiplos setores em lote", async () => {
        const bulkData: BulkCreateSetorData = {
          names: ["Setor 1", "Setor 2", "Setor 3"],
        };

        const mockResult = {
          created: 3,
          names: ["Setor 1", "Setor 2", "Setor 3"],
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: { data: mockResult },
        });

        const result = await RhApiClient.createSetoresBulk(bulkData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/setores",
          bulkData,
        );
        expect(result).toEqual(mockResult);
      });

      it("deve validar limite de setores em lote", async () => {
        const invalidData = {
          names: new Array(51).fill("Setor"), // Mais de 50 setores
        } as BulkCreateSetorData;

        await expect(
          RhApiClient.createSetoresBulk(invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("updateSetor", () => {
      it("deve atualizar setor com sucesso", async () => {
        const updateData: UpdateSetorData = {
          oldName: "Setor Antigo",
          newName: "Setor Novo",
        };

        const mockUpdatedSetor: Setor = {
          name: "Setor Novo",
        };

        mockHttpClient.put.mockResolvedValue({
          success: true,
          data: { data: mockUpdatedSetor },
        });

        const result = await RhApiClient.updateSetor(updateData);

        expect(mockHttpClient.put).toHaveBeenCalledWith(
          "/api/setores",
          updateData,
        );
        expect(result).toEqual(mockUpdatedSetor);
      });
    });

    describe("deleteSetor", () => {
      it("deve deletar setor com sucesso", async () => {
        mockHttpClient.delete.mockResolvedValue({
          success: true,
          data: {},
        });

        await RhApiClient.deleteSetor("Setor Teste");

        expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/setores", {
          name: "Setor Teste",
        });
      });
    });

    describe("deleteSetoresBulk", () => {
      it("deve deletar múltiplos setores em lote", async () => {
        const names = ["Setor 1", "Setor 2"];
        const mockResult = {
          deleted: 2,
          names: ["Setor 1", "Setor 2"],
        };

        mockHttpClient.delete.mockResolvedValue({
          success: true,
          data: { data: mockResult },
        });

        const result = await RhApiClient.deleteSetoresBulk(names);

        expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/setores", {
          names,
        });
        expect(result).toEqual(mockResult);
      });
    });

    describe("setorExists", () => {
      it("deve verificar se setor existe", async () => {
        const mockSetores: Setor[] = [{ name: "Vendas" }, { name: "Suporte" }];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockSetores },
        });

        const exists = await RhApiClient.setorExists("Vendas");
        const notExists = await RhApiClient.setorExists("Inexistente");

        expect(exists).toBe(true);
        expect(notExists).toBe(false);
      });

      it("deve retornar false em caso de erro", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        const result = await RhApiClient.setorExists("Vendas");

        expect(result).toBe(false);
      });
    });
  });

  describe("Métodos Auxiliares", () => {
    describe("getRhStatistics", () => {
      it("deve obter estatísticas de RH", async () => {
        const mockFuncoes = [
          { name: "Atendente", attendantCount: 10 },
          { name: "Supervisor", attendantCount: 0 },
        ];

        const mockSetores = [
          { name: "Vendas", attendantCount: 15 },
          { name: "Suporte", attendantCount: 8 },
          { name: "Marketing", attendantCount: 0 },
        ];

        mockHttpClient.get
          .mockResolvedValueOnce({
            success: true,
            data: { data: mockFuncoes },
          })
          .mockResolvedValueOnce({
            success: true,
            data: { data: mockSetores },
          });

        const result = await RhApiClient.getRhStatistics();

        expect(result).toEqual({
          totalFuncoes: 2,
          totalSetores: 3,
          funcoesComAtendentes: 1,
          setoresComAtendentes: 2,
        });
      });

      it("deve tratar erro ao obter estatísticas", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        await expect(RhApiClient.getRhStatistics()).rejects.toThrow(
          "Falha ao obter estatísticas de RH",
        );
      });
    });

    describe("validateRhData", () => {
      it("deve validar dados válidos para criação", async () => {
        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: [] },
        });

        const result = await RhApiClient.validateRhData(
          "funcao",
          "Nova Função",
          "create",
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("deve detectar nome vazio", async () => {
        const result = await RhApiClient.validateRhData("funcao", "", "create");

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Nome é obrigatório");
      });

      it("deve detectar nome muito longo", async () => {
        const longName = "a".repeat(101);
        const result = await RhApiClient.validateRhData(
          "funcao",
          longName,
          "create",
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Nome muito longo (máximo 100 caracteres)",
        );
      });

      it("deve detectar função já existente", async () => {
        const mockFuncoes: Funcao[] = [{ name: "Função Existente" }];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockFuncoes },
        });

        const result = await RhApiClient.validateRhData(
          "funcao",
          "Função Existente",
          "create",
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Função já existe");
      });

      it("deve adicionar aviso para operação de delete", async () => {
        const result = await RhApiClient.validateRhData(
          "setor",
          "Setor Teste",
          "delete",
        );

        expect(result.warnings).toContain(
          "Verifique se não há atendentes vinculados antes de deletar",
        );
      });

      it("deve tratar erro interno na validação", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        const result = await RhApiClient.validateRhData(
          "funcao",
          "Teste",
          "create",
        );

        // O método ainda valida os dados básicos mesmo com erro na verificação de existência
        // Neste caso, 'Teste' é um nome válido, então isValid será true
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("syncRhData", () => {
      it("deve sincronizar dados de RH", async () => {
        const mockFuncoes: Funcao[] = [
          { name: "Atendente" },
          { name: "Supervisor" },
        ];

        const mockSetores: Setor[] = [{ name: "Vendas" }, { name: "Suporte" }];

        mockHttpClient.get
          .mockResolvedValueOnce({
            success: true,
            data: { data: mockFuncoes },
          })
          .mockResolvedValueOnce({
            success: true,
            data: { data: mockSetores },
          });

        const result = await RhApiClient.syncRhData();

        expect(result.funcoes).toEqual(mockFuncoes);
        expect(result.setores).toEqual(mockSetores);
        expect(result.lastSync).toBeInstanceOf(Date);
      });

      it("deve tratar erro na sincronização", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        await expect(RhApiClient.syncRhData()).rejects.toThrow(
          "Falha ao sincronizar dados de RH",
        );
      });
    });
  });
});
