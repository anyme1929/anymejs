// src/service/UserService.ts
import { User } from "../models/User";
import { type Repository } from "typeorm";
import { type Redis } from "ioredis";
import { injectRepository, injectRedis } from "../src";
export class UserService {
  constructor(
    @injectRedis() private redis: Redis,
    @injectRepository(User) private userRepository: Repository<User>
  ) {}

  // 1. 创建用户（含业务校验）
  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }
  async getAll() {
    this.redis.set("test", "test");
    return await this.userRepository.find();
  }
}
