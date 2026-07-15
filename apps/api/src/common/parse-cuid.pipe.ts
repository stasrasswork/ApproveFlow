import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { CUID_PATTERN } from './is-cuid.js';

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !CUID_PATTERN.test(value)) {
      throw new BadRequestException('Invalid id');
    }
    return value;
  }
}
