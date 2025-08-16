// src/service/UserService.ts
import { User } from "../models/User";
import { injectRepository, Repository } from "../src";
export class UserService {
  constructor(
    @injectRepository(User) private userRepository: Repository<User>
  ) {}

  // 1. 创建用户（含业务校验）
  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }
  async getAll() {
    return await this.userRepository.find();
  }
}
