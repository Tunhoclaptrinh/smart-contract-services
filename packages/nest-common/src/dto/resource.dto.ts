import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Largest batch an import or a bulk delete accepts. */
export const MAX_BATCH = 500;

/**
 * Query of `GET /resources/:resource`. The pipe checks the shape (first layer); BaseService checks
 * the meaning against resources.json (which fields may be filtered or sorted).
 */
export class ListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: "Words to find; accents and case ignored",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ default: "createdAt" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";

  @ApiPropertyOptional({
    description:
      'JSON: {"kind":"BUYER"}, {"kind":["A","B"]} or operators {"amount":{"gte":1,"lte":9}}',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  filters?: string;

  @ApiPropertyOptional({
    description: "Comma-separated field keys to return, in order",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  columns?: string;

  @ApiPropertyOptional({
    description: "Comma-separated select/boolean/ref fields to count values of",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facets?: string;
}

export class ImportBodyDto {
  @ApiProperty({
    type: "array",
    items: { type: "object" },
    maxItems: MAX_BATCH,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH)
  @IsObject({ each: true })
  items!: Record<string, unknown>[];
}

export class BulkDeleteDto {
  @ApiProperty({ type: [String], maxItems: MAX_BATCH })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH)
  @IsString({ each: true })
  ids!: string[];
}

export class ExportQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ["csv", "json"], default: "csv" })
  @IsOptional()
  @IsIn(["csv", "json"])
  format?: string;
}
