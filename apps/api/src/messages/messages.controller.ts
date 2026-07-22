import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/types';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateConversationDto,
} from './dto/messages.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('contacts')
  contacts(@CurrentUser() user: JwtPayload) {
    return this.messagesService.listContacts(user);
  }

  @Get('conversations')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('tab') tab?: 'recientes' | 'sin_leer' | 'archivados',
  ) {
    return this.messagesService.listConversations(user, tab ?? 'recientes');
  }

  @Post('conversations')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagesService.getOrCreate(user, dto);
  }

  @Get('conversations/:id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messagesService.getConversation(user, id);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.listMessages(
      user,
      id,
      cursor,
      limit ? Number(limit) : 50,
    );
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(user, id, dto);
  }

  @Post('conversations/:id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          originalname: string;
          size: number;
        }
      | undefined,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")');
    return this.messagesService.uploadAttachment(user, id, file);
  }

  @Patch('conversations/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.messagesService.updateConversation(user, id, dto);
  }

  @Delete('conversations/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messagesService.softDeleteConversation(user, id);
  }

  @Delete('conversations/:id/permanent')
  removePermanent(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messagesService.hardDeleteConversation(user, id);
  }

  @Post('conversations/:id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messagesService.markRead(user, id);
  }
}
