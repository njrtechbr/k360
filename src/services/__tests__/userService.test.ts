import { UserService } from "../userService";
import { UserApiClient } from "../userApiClient";
import { Role } from "@prisma/client";

// Mock do UserApiClient
jest.mock("../userApiClient");
const mockUserApiClient = UserApiClient as jest.Mocked<typeof UserApiClient>;

describe("UserService (Wrapper)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delegate findAll to UserApiClient", async () => {
    const mockUsers = [
      { id: "1", name: "User 1", email: "user1@test.com", role: Role.USUARIO },
      { id: "2", name: "User 2", email: "user2@test.com", role: Role.ADMIN },
    ];

    mockUserApiClient.findAll.mockResolvedValue(mockUsers);

    const result = await UserService.findAll();

    expect(mockUserApiClient.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockUsers);
  });

  it("should delegate findById to UserApiClient", async () => {
    const mockUser = {
      id: "1",
      name: "User 1",
      email: "user1@test.com",
      role: Role.USUARIO,
    };

    mockUserApiClient.findById.mockResolvedValue(mockUser);

    const result = await UserService.findById("1");

    expect(mockUserApiClient.findById).toHaveBeenCalledWith("1");
    expect(result).toEqual(mockUser);
  });

  it("should delegate create to UserApiClient", async () => {
    const userData = {
      name: "New User",
      email: "newuser@test.com",
      password: "password123",
      role: Role.USUARIO,
      modules: [],
    };

    const mockCreatedUser = {
      id: "1",
      ...userData,
      password: "hashed_password",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserApiClient.create.mockResolvedValue(mockCreatedUser);

    const result = await UserService.create(userData);

    expect(mockUserApiClient.create).toHaveBeenCalledWith(userData);
    expect(result).toEqual(mockCreatedUser);
  });

  it("should delegate verifyCredentials to UserApiClient", async () => {
    const mockUser = {
      id: "1",
      name: "User 1",
      email: "user1@test.com",
      role: Role.USUARIO,
    };

    mockUserApiClient.verifyCredentials.mockResolvedValue(mockUser);

    const result = await UserService.verifyCredentials(
      "user1@test.com",
      "password123",
    );

    expect(mockUserApiClient.verifyCredentials).toHaveBeenCalledWith(
      "user1@test.com",
      "password123",
    );
    expect(result).toEqual(mockUser);
  });

  it("should delegate hasSuperAdmin to UserApiClient", async () => {
    mockUserApiClient.hasSuperAdmin.mockResolvedValue(true);

    const result = await UserService.hasSuperAdmin();

    expect(mockUserApiClient.hasSuperAdmin).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it("should maintain backward compatibility with existing interface", () => {
    // Verificar que todos os métodos existem
    expect(typeof UserService.findAll).toBe("function");
    expect(typeof UserService.findById).toBe("function");
    expect(typeof UserService.findByEmail).toBe("function");
    expect(typeof UserService.create).toBe("function");
    expect(typeof UserService.update).toBe("function");
    expect(typeof UserService.delete).toBe("function");
    expect(typeof UserService.hasSuperAdmin).toBe("function");
    expect(typeof UserService.verifyCredentials).toBe("function");
    expect(typeof UserService.isSuperAdmin).toBe("function");
  });
});
