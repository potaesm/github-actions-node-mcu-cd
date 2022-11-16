# Node MCU Continuous Delivery

[Node MCU CD for GitHub Actions using MQTT](https://github.com/potaesm/github-actions-node-mcu-cd)

## Inputs

### `deviceId`

**Required** To be deployed device id. Default `"0"`.

## Outputs

### `result`

Deployment result.

## Example usage

```yaml
uses: potaesm/github-actions-node-mcu-cd@1.1.4
with:
  deviceId: '0'
```