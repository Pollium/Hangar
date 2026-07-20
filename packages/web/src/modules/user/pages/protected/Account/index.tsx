import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useSession } from '@/shared/hooks/routing/useSession';
import { userApi } from '@/modules/user/api/api';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

// Avatars ride along in the JSON profile patch as a data URL, so we downscale to
// a small square before sending — a 256px JPEG lands around ~20KB, far under the
// request body limit, and avatars never need to be larger than they render.
const AVATAR_SIZE = 256;

const fileToAvatarDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('read-failed'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('decode-failed'));
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = AVATAR_SIZE;
                canvas.height = AVATAR_SIZE;
                const ctx = canvas.getContext('2d');
                if(!ctx){
                    reject(new Error('no-2d-context'));
                    return;
                }
                // Center-crop the source to a square so non-square uploads aren't stretched.
                const side = Math.min(image.width, image.height);
                const sx = (image.width - side) / 2;
                const sy = (image.height - side) / 2;
                ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            image.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });

const AccountPage = () => {
    const { user } = useSession();
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(!user) return;
        setUsername(user.username);
        setAvatarUrl(user.avatarUrl ?? null);
    }, [user]);

    const email = user?.email ?? '';
    const initial = (username || email || '?').charAt(0).toUpperCase();

    const takeFile = async (file: File | undefined) => {
        if(!file || !file.type.startsWith('image/')) return;
        try{
            setAvatarUrl(await fileToAvatarDataUrl(file));
        }catch{
            // A file that can't be decoded just leaves the current avatar in place.
        }
    };

    const submit = async () => {
        setBusy(true);
        try{
            await userApi.updateProfile({
                username: username.trim(),
                avatarUrl
            });
            // Hard reload: the header user chip reads its own useSession() mount and won't
            // otherwise pick up the new name/avatar until the next navigation.
            window.location.reload();
        }catch{
            setBusy(false);
        }
    };

    return (
        <AppShell>
            <Canvas>
                <Row>
                    <PageHeader
                        title='Account'
                    />
                </Row>
                <Row grow>
                    <div className='flex max-w-md flex-col gap-6 py-2'>
                        <div className='flex flex-col gap-2'>
                            <span className='mono-label text-muted/70'>Avatar</span>
                            <div className='flex items-center gap-4'>
                                <button
                                    type='button'
                                    onClick={() => fileInput.current?.click()}
                                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragging(false);
                                        void takeFile(event.dataTransfer.files[0]);
                                    }}
                                    aria-label='Upload avatar'
                                    className={`group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed text-lg font-medium outline-none transition-colors ${dragging ? 'border-accent bg-accent/10' : 'border-hairline bg-foreground/5 hover:border-accent/60'}`}
                                >
                                    {avatarUrl
                                        ? <img src={avatarUrl} alt='' className='size-full object-cover' />
                                        : <span className='text-foreground'>{initial}</span>}
                                    <span className={`absolute inset-0 grid place-items-center bg-background/60 text-foreground transition-opacity ${avatarUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                                        <ImagePlus className='size-5' aria-hidden='true' />
                                    </span>
                                </button>
                                <div className='flex flex-col gap-1'>
                                    <p className='text-sm text-foreground'>Drag an image here, or click to upload</p>
                                    <p className='text-xs text-muted'>PNG or JPG. Cropped to a square.</p>
                                    {avatarUrl && (
                                        <button
                                            type='button'
                                            onClick={() => setAvatarUrl(null)}
                                            className='mt-1 inline-flex w-fit items-center gap-1 text-xs text-muted transition-colors hover:text-danger'
                                        >
                                            <X className='size-3' aria-hidden='true' />
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={fileInput}
                                    type='file'
                                    accept='image/*'
                                    className='hidden'
                                    onChange={(event) => {
                                        void takeFile(event.target.files?.[0]);
                                        event.target.value = '';
                                    }}
                                />
                            </div>
                        </div>
                        <label className='flex flex-col gap-1.5'>
                            <span className='mono-label text-muted/70'>Username</span>
                            <input className={input} value={username} onChange={(event) => setUsername(event.target.value)} />
                        </label>
                        <label className='flex flex-col gap-1.5'>
                            <span className='mono-label text-muted/70'>Email</span>
                            <input className={`${input} cursor-not-allowed text-muted`} value={email} readOnly disabled />
                        </label>
                        <button
                            type='button'
                            onClick={submit}
                            disabled={busy}
                            className='self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
                        >
                            {busy ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </Row>
            </Canvas>
        </AppShell>
    );
};

export default AccountPage;
