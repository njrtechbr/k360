import { ModuleService } from "../moduleService";
import { ModuleApiClient } from "../moduleApiClient";

// Mock do ModuleApiClient
jest.mock("../moduleApiClient");

const mockModuleApiClient = ModuleApiClient as jest.Mocked<
  typeof ModuleApiClient
>;

describe("ModuleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should call ModuleApiClient.findAll", async () => {
      const mockModules = [
        {
          id: "1",
          name: "Test Module",
          description: "Test",
          path: "/test",
          active: true,
        },
      ];

      mockModuleApiClient.findAll.mockResolvedValue(mockModules as any);

      const result = await ModuleService.findAll();

      expect(mockModuleApiClient.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockModules);
    });
  });

  describe("findActive", () => {
    it("should call ModuleApiClient.findActive", async () => {
      const mockModules = [
        {
          id: "1",
          name: "Active Module",
          description: "Test",
          path: "/test",
          active: true,
        },
      ];

      mockModuleApiClient.findActive.mockResolvedValue(mockModules as any);

      const result = await ModuleService.findActive();

      expect(mockModuleApiClient.findActive).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockModules);
    });
  });

  describe("findById", () => {
    it("should call ModuleApiClient.findById with correct id", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: true,
      };

      mockModuleApiClient.findById.mockResolvedValue(mockModule as any);

      const result = await ModuleService.findById("1");

      expect(mockModuleApiClient.findById).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockModule);
    });
  });

  describe("create", () => {
    it("should call ModuleApiClient.create with correct data", async () => {
      const moduleData = {
        id: "1",
        name: "New Module",
        description: "New module description",
        path: "/new-module",
        active: true,
      };

      const mockCreatedModule = { ...moduleData };

      mockModuleApiClient.create.mockResolvedValue(mockCreatedModule as any);

      const result = await ModuleService.create(moduleData);

      expect(mockModuleApiClient.create).toHaveBeenCalledWith(moduleData);
      expect(result).toEqual(mockCreatedModule);
    });
  });

  describe("update", () => {
    it("should call ModuleApiClient.update with correct id and data", async () => {
      const updateData = {
        name: "Updated Module",
        description: "Updated description",
      };

      const mockUpdatedModule = {
        id: "1",
        name: "Updated Module",
        description: "Updated description",
        path: "/test",
        active: true,
      };

      mockModuleApiClient.update.mockResolvedValue(mockUpdatedModule as any);

      const result = await ModuleService.update("1", updateData);

      expect(mockModuleApiClient.update).toHaveBeenCalledWith("1", updateData);
      expect(result).toEqual(mockUpdatedModule);
    });
  });

  describe("delete", () => {
    it("should call ModuleApiClient.delete with correct id", async () => {
      mockModuleApiClient.delete.mockResolvedValue();

      await ModuleService.delete("1");

      expect(mockModuleApiClient.delete).toHaveBeenCalledWith("1");
    });
  });

  describe("toggleActive", () => {
    it("should call ModuleApiClient.toggleActive with correct id", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: false,
      };

      mockModuleApiClient.toggleActive.mockResolvedValue(mockModule as any);

      const result = await ModuleService.toggleActive("1");

      expect(mockModuleApiClient.toggleActive).toHaveBeenCalledWith("1");
      expect(result).toEqual(mockModule);
    });
  });

  describe("addUserToModule", () => {
    it("should call ModuleApiClient.addUserToModule with correct parameters", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: true,
      };

      mockModuleApiClient.addUserToModule.mockResolvedValue(mockModule as any);

      const result = await ModuleService.addUserToModule("module1", "user1");

      expect(mockModuleApiClient.addUserToModule).toHaveBeenCalledWith(
        "module1",
        "user1",
      );
      expect(result).toEqual(mockModule);
    });
  });

  describe("removeUserFromModule", () => {
    it("should call ModuleApiClient.removeUserFromModule with correct parameters", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: true,
      };

      mockModuleApiClient.removeUserFromModule.mockResolvedValue(
        mockModule as any,
      );

      const result = await ModuleService.removeUserFromModule(
        "module1",
        "user1",
      );

      expect(mockModuleApiClient.removeUserFromModule).toHaveBeenCalledWith(
        "module1",
        "user1",
      );
      expect(result).toEqual(mockModule);
    });
  });

  describe("getAllModules", () => {
    it("should call ModuleApiClient.getAllModules (alias for findAll)", async () => {
      const mockModules = [
        {
          id: "1",
          name: "Test Module",
          description: "Test",
          path: "/test",
          active: true,
        },
      ];

      mockModuleApiClient.getAllModules.mockResolvedValue(mockModules as any);

      const result = await ModuleService.getAllModules();

      expect(mockModuleApiClient.getAllModules).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockModules);
    });
  });
});
