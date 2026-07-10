import { Font } from '@react-pdf/renderer'

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7W0I5nvw.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7W0I5nvw.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7W0I5nvw.woff2', fontWeight: 700 },
  ],
})

Font.register({
  family: 'JetBrains Mono',
  src: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaTxj.woff2',
})
