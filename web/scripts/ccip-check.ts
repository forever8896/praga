import { createPublicClient, http, namehash } from 'viem';
import { sepolia } from 'viem/chains';

export {};

const c = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') });

const RESOLVER = '0x8519522032FB505795142Ad833B6059E892eb4c1' as const;

const RESOLVER_ABI = [
  { name: 'url', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'signers', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'supportsInterface', type: 'function', stateMutability: 'pure', inputs: [{ name: 'id', type: 'bytes4' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'resolve', type: 'function', stateMutability: 'view', inputs: [{ name: 'name', type: 'bytes' }, { name: 'data', type: 'bytes' }], outputs: [{ name: '', type: 'bytes' }] },
] as const;

console.log('=== resolver introspection ===');
try {
  const url = await c.readContract({ address: RESOLVER, abi: RESOLVER_ABI, functionName: 'url' });
  console.log('  url:', url);
} catch (e: any) { console.log('  url err:', e.shortMessage ?? String(e).slice(0, 200)); }

// ENSIP-10 wildcard: 0x9061b923
// IExtendedResolver interface ID
for (const iid of ['0x9061b923', '0x01ffc9a7', '0x3b3b57de', '0x59d1d43c'] as const) {
  try {
    const ok = await c.readContract({ address: RESOLVER, abi: RESOLVER_ABI, functionName: 'supportsInterface', args: [iid] });
    console.log(`  supportsInterface(${iid}):`, ok);
  } catch (e: any) {
    console.log(`  supportsInterface(${iid}) err:`, e.shortMessage ?? String(e).slice(0, 100));
  }
}

console.log('\n=== full ENS resolution ===');
try {
  const addr = await c.getEnsAddress({ name: 'ales.pragueconnect.eth' });
  console.log('  addr:', addr);
} catch (e: any) {
  console.log('  addr err:', e.shortMessage);
  if (e.cause) console.log('  cause:', e.cause.shortMessage ?? e.cause.message?.slice(0, 300));
  if (e.metaMessages) console.log('  meta:', e.metaMessages);
}
