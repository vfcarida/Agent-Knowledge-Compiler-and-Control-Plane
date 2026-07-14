# AKCP Profile v1

The Agent Knowledge Compiler and Control Plane (AKCP) (AKCP) Profile v1 is an extension of the Open Knowledge Format (OKF) specification, heavily tailored for modeling professional career management data.

## Base Conformance

As per the OKF specification:

- Every document MUST use valid UTF-8 Markdown.
- Every document MUST have a YAML frontmatter block enclosed by `---`.
- The `type` field in the frontmatter is REQUIRED.
- Unknown keys MUST be preserved during parsing or round-trip serialization.

## Profile Metadata

A valid AKCP bundle should specify the following in its configurations or root index:

```yaml
schemaVersion: "ocf.profile/v1"
bundleVersion: "1.0.0"
okfVersion: "0.1"
bundleType: "career"
profile: "career-management"
```

## Standard Base Fields

While OKF only strictly requires `type`, the AKCP Profile RECOMMENDS the following standard OKF fields for all document types:

- `title`: A human-readable title.
- `description`: A brief summary of the document.
- `tags`: An array of strings for categorization.
- `timestamp`: The creation or modification date in ISO 8601 format.

## Defined Collections (Types)

The AKCP Profile strictly defines the following types, typically stored in matching directory structures:

### `Skill` (Directory: `skills/`)

Models technical and core competencies.

- **Fields**:
  - `level`: (string) e.g., Beginner, Intermediate, Advanced, Expert.
  - `yearsOfExperience`: (number)
  - `category`: (string) e.g., Backend, Frontend, Leadership.

### `Experience` (Directory: `experiences/`)

Models professional roles and job history.

- **Fields**:
  - `company`: (string)
  - `role`: (string)
  - `startDate`: (string - YYYY-MM)
  - `endDate`: (string - YYYY-MM or 'Present')
  - `current`: (boolean)
  - `location`: (string)
  - `technologies`: (array of strings)

### `Education` (Directory: `education/`)

Models academic credentials and studies.

- **Fields**:
  - `institution`: (string)
  - `degree`: (string)
  - `field`: (string)
  - `startDate`: (string)
  - `endDate`: (string)
  - `current`: (boolean)
  - `location`: (string)

### `Certificate` (Directory: `certificates/`)

Tracks verified certifications.

- **Fields**:
  - `issuer`: (string)
  - `dateObtained`: (string)
  - `credentialId`: (string)
  - `url`: (string)
  - `expirationDate`: (string)

### `Project` (Directory: `projects/`)

Models portfolio items and contributions.

- **Fields**:
  - `url`: (string)
  - `technologies`: (array of strings)
  - `startDate`: (string)
  - `endDate`: (string)
  - `role`: (string)
  - `outcomes`: (array of strings)

### `Preference` (Directory: `preferences/`)

Models target search parameters and limits.

- **Fields**:
  - `locations`: (array of strings)
  - `remote`: (boolean)
  - `salaryRange`: (string)
  - `roles`: (array of strings)
  - `contractTypes`: (array of strings)

### `Application` (Directory: `applications/`)

Tracks candidates' pipeline funnel for job applications.

- **Fields**:
  - `platform`: (string)
  - `status`: (string) e.g., Draft, Saved, Applied, Interviewing, Rejected.
  - `appliedAt`: (string)
  - `url`: (string)
  - `company`: (string)
  - `jobTitle`: (string)
