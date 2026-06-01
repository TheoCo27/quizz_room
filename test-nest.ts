import 'reflect-metadata';
import { validate } from 'class-validator';
import { IsOptional, IsIn } from 'class-validator';

class DTO {
  @IsOptional()
  @IsIn([10, 30, null])
  questionDurationSec?: 10 | 30 | null;
}

const d = new DTO();
d.questionDurationSec = null;

validate(d).then(errors => {
  console.log("Validation errors with null:", errors);
});

const d2 = new DTO();
d2.questionDurationSec = undefined;

validate(d2).then(errors => {
  console.log("Validation errors with undefined:", errors);
});

const d3 = new DTO();
d3.questionDurationSec = 0 as any;

validate(d3).then(errors => {
  console.log("Validation errors with 0:", errors.length > 0 ? "HAS ERRORS" : "NO ERRORS");
});
