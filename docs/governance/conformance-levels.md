# Conformance Levels

AKCP defines four distinct levels of conformance. Any knowledge bundle can be tested against these levels using the `pnpm akcp validate` command or the `@akcp/conformance` test suite.

## Level 1: OKF-Compatible
The bundle consists of valid Markdown files with strictly-typed YAML frontmatter complying with the [Open Knowledge Format v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog). 
*Requirement:* The parser must not throw any structural errors.

## Level 2: AKCP-Profile-Compatible
The bundle's frontmatter adheres to one of the AKCP Domain Profiles (e.g. Career, IT Operations).
*Requirement:* The documents must pass Zod schema validation for their declared `type`.

## Level 3: AKCP-Compiler-Compatible
The bundle can be fully resolved into the Agent Knowledge Intermediate Representation (AK-IR) without broken semantic links.
*Requirement:* The compiler successfully builds the graph and generates the output artifacts.

## Level 4: AKCP-Control-Plane-Compatible
The bundle defines explicit, secure runtime bounds via Policy Cards (`.policy.yaml`) and maps capabilities cleanly.
*Requirement:* An `akcp.yaml` is present, valid, and all capabilities have declared risk levels and approval requirements.
