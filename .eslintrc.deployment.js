module.exports = {
  extends: ['./.eslintrc.js'],
  rules: {
    // Deployment Safety Rules
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-unused-vars': 'warn',
    
    // Environment Variable Safety
    'no-process-env': 'off', // We need env vars, but check usage patterns
    
    // Custom rules for deployment safety
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[object.object.name='process'][object.property.name='env'][property.name][computed=false] + TSNonNullExpression",
        message: "Unsafe non-null assertion on environment variable. Use safe fallbacks instead."
      },
      {
        selector: "CallExpression[callee.name='createServerClient'] MemberExpression[object.object.name='process'][object.property.name='env'] + TSNonNullExpression",
        message: "Unsafe Supabase client creation. Use build-time detection and fallbacks."
      }
    ],
    
    // Build-time safety
    'no-restricted-globals': [
      'error',
      {
        name: 'window',
        message: 'Direct window access detected. Use `typeof window !== "undefined"` guard.'
      },
      {
        name: 'document',
        message: 'Direct document access detected. Use `typeof document !== "undefined"` guard.'
      },
      {
        name: 'localStorage',
        message: 'Direct localStorage access detected. Use client-side guard.'
      }
    ]
  },
  
  overrides: [
    {
      files: ['app/**/*.tsx', 'components/**/*.tsx'],
      rules: {
        // Stricter rules for UI components
        'react-hooks/exhaustive-deps': 'error',
        '@typescript-eslint/no-explicit-any': 'warn'
      }
    },
    {
      files: ['middleware.ts', 'lib/supabase/**/*.ts'],
      rules: {
        // Critical files need extra safety
        '@typescript-eslint/no-non-null-assertion': 'error',
        'no-console': ['warn', { allow: ['warn', 'error'] }]
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        // Scripts can be more lenient
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};