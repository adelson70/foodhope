import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsObrigatorio(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isObrigatorio',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: (args: ValidationArguments) => {
          if (validationOptions?.message) {
            return validationOptions.message as string;
          }
          return `O campo '${args.property}' é de preenchimento obrigatório.`;
        },
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          return value !== undefined && value !== null && value !== '';
        },
      },
    });
  };
}
