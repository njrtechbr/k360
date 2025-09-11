import { AttendantService } from "../attendantService";
import { AttendantApiClient } from "../attendantApiClient";

// Mock do AttendantApiClient
jest.mock("../attendantApiClient");

const mockAttendantApiClient = AttendantApiClient as jest.Mocked<
  typeof AttendantApiClient
>;

describe("AttendantService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should delegate to AttendantApiClient.findAll", async () => {
      const mockAttendants = [
        { id: "1", name: "Test Attendant", email: "test@example.com" },
      ];

      mockAttendantApiClient.findAll.mockResolvedValue(mockAttendants as any);

      const result = await AttendantService.findAll();

      expect(mockAttendantApiClient.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAttendants);
    });
  });

  describe("findById", () => {
    it("should delegate to AttendantApiClient.findById", async () => {
      const mockAttendant = {
        id: "1",
        name: "Test Attendant",
        email: "test@example.com",
      };

      mockAttendantApiClient.findById.mockResolvedValue(mockAttendant as any);

      const result = await AttendantService.findById("1");

      expect(mockAttendantApiClient.findById).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockAttendant);
    });
  });

  describe("create", () => {
    it("should delegate to AttendantApiClient.create", async () => {
      const mockData = {
        name: "Test Attendant",
        email: "test@example.com",
        funcao: "Test Function",
        setor: "Test Sector",
        status: "Ativo",
        telefone: "11999999999",
        rg: "123456789",
        cpf: "12345678901",
        dataAdmissao: new Date(),
        dataNascimento: new Date(),
      };

      const mockAttendant = { id: "1", ...mockData };

      mockAttendantApiClient.create.mockResolvedValue(mockAttendant as any);

      const result = await AttendantService.create(mockData);

      expect(mockAttendantApiClient.create).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockAttendant);
    });
  });

  describe("createBatch", () => {
    it("should delegate to AttendantApiClient.createBatch", async () => {
      const mockData = [
        {
          name: "Test Attendant 1",
          email: "test1@example.com",
          funcao: "Test Function",
          setor: "Test Sector",
          status: "Ativo",
          telefone: "11999999999",
          rg: "123456789",
          cpf: "12345678901",
          dataAdmissao: new Date(),
          dataNascimento: new Date(),
        },
      ];

      const mockAttendants = [{ id: "1", ...mockData[0] }];

      mockAttendantApiClient.createBatch.mockResolvedValue(
        mockAttendants as any,
      );

      const result = await AttendantService.createBatch(mockData, "import-123");

      expect(mockAttendantApiClient.createBatch).toHaveBeenCalledWith(
        mockData,
        "import-123",
      );
      expect(result).toEqual(mockAttendants);
    });
  });

  describe("deleteByImportId", () => {
    it("should delegate to AttendantApiClient.deleteByImportId", async () => {
      mockAttendantApiClient.deleteByImportId.mockResolvedValue(5);

      const result = await AttendantService.deleteByImportId("import-123");

      expect(mockAttendantApiClient.deleteByImportId).toHaveBeenCalledWith(
        "import-123",
      );
      expect(result).toBe(5);
    });
  });

  describe("getAllAttendants", () => {
    it("should delegate to AttendantApiClient.getAllAttendants", async () => {
      const mockAttendants = [
        { id: "1", name: "Test Attendant", email: "test@example.com" },
      ];

      mockAttendantApiClient.getAllAttendants.mockResolvedValue(
        mockAttendants as any,
      );

      const result = await AttendantService.getAllAttendants();

      expect(mockAttendantApiClient.getAllAttendants).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAttendants);
    });
  });
});
