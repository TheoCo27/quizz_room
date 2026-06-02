// Ce fichier expose les endpoints HTTP de consultation et creation des quiz.
import { ApiExceptionFilter } from "@/common/http/api-exception.filter";
import { ok, type ApiResponse } from "@/common/http/api-response";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { QuizzesService, type QuizResponse } from "./quizzes.service";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { AuthPayload } from "@/modules/auth/types/auth-payload.type";

@Controller("quizzes")
@UseFilters(ApiExceptionFilter)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // Retourne la liste complete des quiz disponibles.
  @Get()
  async listQuizzes(): Promise<ApiResponse<QuizResponse[]>> {
    return ok(await this.quizzesService.listQuizzes());
  }

  // Retourne la liste des quiz crees par l'utilisateur connecte.
  @UseGuards(AuthGuard)
  @Get("me")
  async listMyQuizzes(
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<QuizResponse[]>> {
    return ok(await this.quizzesService.listMyQuizzes(auth.sub));
  }

  // Retourne le detail complet d'un quiz par son identifiant.
  @Get(":quizId")
  async getQuizById(
    @Param("quizId", ParseIntPipe) quizId: number,
  ): Promise<ApiResponse<QuizResponse>> {
    return ok(await this.quizzesService.getQuizById(quizId));
  }

  // Cree un quiz et toutes ses questions en une seule requete.
  @UseGuards(AuthGuard)
  @Post()
  async createQuiz(
    @Body() dto: CreateQuizDto,
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<QuizResponse>> {
    return ok(await this.quizzesService.createQuiz(dto, auth.sub));
  }

  // Met a jour un quiz existant.
  @UseGuards(AuthGuard)
  @Patch(":quizId")
  async updateQuiz(
    @Param("quizId", ParseIntPipe) quizId: number,
    @Body() dto: CreateQuizDto,
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<QuizResponse>> {
    return ok(await this.quizzesService.updateQuiz(quizId, auth.sub, dto));
  }

  // Supprime un quiz.
  @UseGuards(AuthGuard)
  @Delete(":quizId")
  async deleteQuiz(
    @Param("quizId", ParseIntPipe) quizId: number,
    @CurrentUser() auth: AuthPayload,
  ): Promise<ApiResponse<void>> {
    await this.quizzesService.deleteQuiz(quizId, auth.sub);
    return ok(undefined as any);
  }
}
