import { IsString } from "class-validator";

export class UpdateFreelancerAvatarDto {
  @IsString()
  avatarUrl!: string;
}
