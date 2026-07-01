import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

async function validateDto(plain: Record<string, unknown>) {
  const dto = plainToInstance(CreateLeadDto, plain);
  return validate(dto);
}

describe('CreateLeadDto', () => {
  describe('phone (BR)', () => {
    it('aceita celular em E.164 com 9 na frente (padrão atual)', async () => {
      const errors = await validateDto({
        name: 'Lead',
        phone: '+5511987654321',
      });
      expect(errors).toHaveLength(0);
    });

    it('aceita fixo em E.164 com 8 dígitos locais (menos dígitos que celular)', async () => {
      const errors = await validateDto({
        name: 'Lead',
        phone: '+551123456789',
      });
      expect(errors).toHaveLength(0);
    });

    it('aceita fixo em outra área (8 dígitos após DDD)', async () => {
      const errors = await validateDto({
        name: 'Lead',
        phone: '+553432123456',
      });
      expect(errors).toHaveLength(0);
    });

    it('aceita número nacional com DDD quando região é BR', async () => {
      const errors = await validateDto({
        name: 'Lead',
        phone: '1132345678',
      });
      expect(errors).toHaveLength(0);
    });

    it('rejeita número curto demais para BR', async () => {
      const errors = await validateDto({
        name: 'Lead',
        phone: '+5511999',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('phone');
    });

    it('omite validação de phone quando campo ausente', async () => {
      const errors = await validateDto({ name: 'Só nome' });
      expect(errors).toHaveLength(0);
    });
  });
});
