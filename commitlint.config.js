module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      headerPattern: /^\[([A-Z]+)\]\s+(\w+)(?:\(([^)]+)\))?:\s+(.+)$/,
      headerCorrespondence: ['project', 'type', 'scope', 'subject']
    }
  },
  rules: {
    'header-match-project': [2, 'always']
  },
  plugins: [
    {
      rules: {
        'header-match-project': (parsed) => {
          const { project } = parsed;
          if (!project || project !== 'DQP') {
            return [false, 'Commit header must start with [DQP] (e.g. "[DQP] feat(checkout): add feature (DQP-1)")'];
          }
          return [true];
        }
      }
    }
  ]
};
