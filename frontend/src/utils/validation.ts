import * as yup from 'yup';

export const tokenCreateSchema = yup.object({
  name: yup.string().required('Token name is required'),
  symbol: yup.string().required('Token symbol is required'),
  decimals: yup.number()
    .required('Decimals are required')
    .min(0, 'Decimals must be positive')
    .max(9, 'Decimals cannot exceed 9'),
  imageUrl: yup.string().url('Must be a valid URL'),
  socials: yup.object({
    telegram: yup.string().url('Must be a valid URL'),
    twitter: yup.string().url('Must be a valid URL'),
    website: yup.string().url('Must be a valid URL')
  })
});

export const walletImportSchema = yup.object({
  privateKey: yup.string().required('Private key is required'),
  type: yup.string().oneOf(['dev', 'sub'], 'Invalid wallet type')
}); 